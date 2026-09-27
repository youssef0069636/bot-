import { AIStructuredAction, BotState, Coordinates, PlayerInfo } from '../../types/minecraft';

export interface ActionPlanResult {
  rawPrompt: string;
  structuredAction: AIStructuredAction;
  canAutoExecute: boolean;
  warnings: string[];
}

export class AIPlanner {
  /**
   * Evaluates safety risk for coordinates and actions.
   */
  public static validateSafety(
    action: AIStructuredAction['action'],
    target?: AIStructuredAction['target'],
    currentState?: BotState
  ): { risk: 'safe' | 'caution' | 'dangerous'; reason?: string } {
    if (action === 'move_to' && target) {
      const y = target.y ?? (currentState?.position.y || 64);
      const x = target.x ?? (currentState?.position.x || 0);
      const z = target.z ?? (currentState?.position.z || 0);

      // Void check
      if (y < -60) {
        return {
          risk: 'dangerous',
          reason: `Target Y level (${y}) is dangerously close to the Void (< -64). High risk of fatal void damage.`,
        };
      }

      // Nether ceiling or roof check
      if (currentState?.dimension === 'the_nether' && y > 127) {
        return {
          risk: 'caution',
          reason: 'Target is on or above the Nether bedrock roof (Y > 127). Ensure safe pathing.',
        };
      }

      // Very long distance check
      if (currentState) {
        const dist = Math.hypot(x - currentState.position.x, z - currentState.position.z);
        if (dist > 500) {
          return {
            risk: 'caution',
            reason: `Target distance is ${Math.round(dist)} blocks away across unloaded chunks.`,
          };
        }
      }
    }

    if (action === 'follow_player') {
      return {
        risk: 'safe',
        reason: 'Player tracking engages pathfinder within safe line-of-sight distance.',
      };
    }

    if (action === 'mine_block') {
      return {
        risk: 'caution',
        reason: 'Mining straight down or without lighting can breach lava pockets or mob spawners.',
      };
    }

    return { risk: 'safe' };
  }

  /**
   * Deterministic local NLP planner for Minecraft commands (fallback & offline fast path)
   */
  public static planLocally(
    prompt: string,
    currentState: BotState,
    players: PlayerInfo[]
  ): ActionPlanResult {
    const p = prompt.trim().toLowerCase();
    const warnings: string[] = [];

    // 1. Stop command
    if (p.includes('stop') || p.includes('halt') || p.includes('freeze') || p.includes('cancel')) {
      const structuredAction: AIStructuredAction = {
        action: 'stop',
        explanation: 'Immediately abort all active tasks, pathfinding, and movement.',
        safetyRisk: 'safe',
      };
      return { rawPrompt: prompt, structuredAction, canAutoExecute: true, warnings };
    }

    // 2. Go to spawn / Return home
    if (p.includes('spawn') || p.includes('return home') || p.includes('go home')) {
      const target = { x: 0, y: 64, z: 0 };
      const safety = this.validateSafety('move_to', target, currentState);
      const structuredAction: AIStructuredAction = {
        action: 'move_to',
        target,
        explanation: 'Plot waypoint course back to world spawn origin (0, 64, 0).',
        safetyRisk: safety.risk,
        riskReason: safety.reason,
      };
      return { rawPrompt: prompt, structuredAction, canAutoExecute: safety.risk === 'safe', warnings };
    }

    // 3. Follow player
    if (p.includes('follow')) {
      let targetName = '';
      for (const player of players) {
        if (p.includes(player.username.toLowerCase())) {
          targetName = player.username;
          break;
        }
      }
      if (!targetName && players.length > 0) {
        targetName = players[0].username;
      }

      if (targetName) {
        const playerObj = players.find((pl) => pl.username.toLowerCase() === targetName.toLowerCase());
        const structuredAction: AIStructuredAction = {
          action: 'follow_player',
          target: {
            name: targetName,
            x: playerObj?.position.x,
            y: playerObj?.position.y,
            z: playerObj?.position.z,
          },
          explanation: `Engage continuous distance tracking behind player ${targetName}.`,
          safetyRisk: 'safe',
        };
        return { rawPrompt: prompt, structuredAction, canAutoExecute: true, warnings };
      }
    }

    // 4. Coordinates extraction: e.g. "go to 120 64 -32" or "tp 100 64 200"
    const coordMatch = p.match(/(?:go to|goto|move to|teleport to|tp to|walk to)?\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    if (coordMatch) {
      const x = parseFloat(coordMatch[1]);
      const y = parseFloat(coordMatch[2]);
      const z = parseFloat(coordMatch[3]);
      const target = { x, y, z };
      const safety = this.validateSafety('move_to', target, currentState);

      const structuredAction: AIStructuredAction = {
        action: 'move_to',
        target,
        explanation: `Calculate pathfinding route to designated coordinates (${x}, ${y}, ${z}).`,
        safetyRisk: safety.risk,
        riskReason: safety.reason,
      };
      return { rawPrompt: prompt, structuredAction, canAutoExecute: safety.risk === 'safe', warnings };
    }

    // 5. Village / Point of interest
    if (p.includes('village')) {
      const target = { x: 280, y: 68, z: -140 };
      const safety = this.validateSafety('move_to', target, currentState);
      const structuredAction: AIStructuredAction = {
        action: 'move_to',
        target,
        explanation: 'Pathfind toward known Plains Village settlement at coordinates (280, 68, -140).',
        safetyRisk: safety.risk,
        riskReason: safety.reason,
      };
      return { rawPrompt: prompt, structuredAction, canAutoExecute: false, warnings };
    }

    // 6. Find / mine iron or diamonds
    if (p.includes('iron') || p.includes('diamond') || p.includes('mine') || p.includes('collect')) {
      const isDiamond = p.includes('diamond');
      const isIron = p.includes('iron');
      const targetItem = isDiamond ? 'diamond_ore' : isIron ? 'iron_ore' : 'cobblestone';
      const targetDepth = isDiamond ? -54 : 16;

      const structuredAction: AIStructuredAction = {
        action: 'mine_block',
        target: {
          name: targetItem,
          y: targetDepth,
          count: 8,
        },
        explanation: `Subsurface scanning for ${targetItem} around optimal mining layer Y=${targetDepth}.`,
        safetyRisk: 'caution',
        riskReason: 'Deep underground mining requires torch maintenance and lava safety margins.',
      };
      return { rawPrompt: prompt, structuredAction, canAutoExecute: false, warnings };
    }

    // 7. Check inventory or report position
    if (p.includes('inventory') || p.includes('equipment') || p.includes('items')) {
      const structuredAction: AIStructuredAction = {
        action: 'chat',
        target: {
          message: `Bot report: Selected slot ${currentState.selectedSlot + 1}, Health: ${currentState.health}/20, Food: ${currentState.food}/20.`,
        },
        explanation: 'Broadcast current bot inventory and vitals status in chat.',
        safetyRisk: 'safe',
      };
      return { rawPrompt: prompt, structuredAction, canAutoExecute: true, warnings };
    }

    if (p.includes('coordinate') || p.includes('pos') || p.includes('where')) {
      const structuredAction: AIStructuredAction = {
        action: 'chat',
        target: {
          message: `Current coordinates: X=${currentState.position.x}, Y=${currentState.position.y}, Z=${currentState.position.z} (${currentState.dimension})`,
        },
        explanation: 'Broadcast current XYZ coordinates and biome in chat.',
        safetyRisk: 'safe',
      };
      return { rawPrompt: prompt, structuredAction, canAutoExecute: true, warnings };
    }

    // Default general action
    const structuredAction: AIStructuredAction = {
      action: 'chat',
      target: { message: `AI Assistant parsed: "${prompt}" - Awaiting confirmation.` },
      explanation: `Analyze prompt "${prompt}" and request operator confirmation.`,
      safetyRisk: 'safe',
    };
    return { rawPrompt: prompt, structuredAction, canAutoExecute: false, warnings };
  }
}
