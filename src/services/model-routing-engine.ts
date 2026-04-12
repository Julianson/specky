/**
 * ModelRoutingEngine — Static routing table for Specky phases.
 * Maps each SDD pipeline phase to the optimal model, mode, and
 * extended thinking setting. Based on empirical research.
 */

export type ModelTier = 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5' | 'gpt-4-5';
export type ChatMode = 'ask' | 'plan' | 'agent';
export type PremiumMultiplier = '3x' | '1x' | '0.33x';

export interface ModelRoutingHint {
  model: ModelTier;
  mode: ChatMode;
  thinking: boolean;
  rationale: string;
  evidence_id: string;
  premium_multiplier: PremiumMultiplier;
}

export interface ComplexitySignal {
  file_count?: number;
  spec_clarity?: 'clear' | 'ambiguous';
  has_feedback_loop?: boolean;
}

export interface CostAnalysis {
  team_size: number;
  requests_per_day: number;
  correct_routing_units: number;
  opus_only_units: number;
  savings_percent: number;
  savings_label: string;
}

export class ModelRoutingEngine {
  private static readonly ROUTING_TABLE: Record<string, ModelRoutingHint> = {
    init: {
      model: 'claude-haiku-4-5',
      mode: 'ask',
      thinking: false,
      rationale: 'Init is structured with no ambiguity — Haiku is optimal.',
      evidence_id: 'arXiv:2603.05344',
      premium_multiplier: '0.33x',
    },
    discover: {
      model: 'claude-sonnet-4-6',
      mode: 'ask',
      thinking: false,
      rationale: 'Discovery questions are structured; reasoning depth adds no value.',
      evidence_id: 'arXiv:2505.09027',
      premium_multiplier: '1x',
    },
    specify: {
      model: 'claude-opus-4-6',
      mode: 'ask',
      thinking: true,
      rationale: 'Specify has high ambiguity and no executable feedback — extended thinking justified.',
      evidence_id: 'arXiv:2502.08235',
      premium_multiplier: '3x',
    },
    clarify: {
      model: 'claude-opus-4-6',
      mode: 'ask',
      thinking: true,
      rationale: 'Clarify resolves implicit constraints and contradictions — reasoning depth critical.',
      evidence_id: 'arXiv:2509.13758',
      premium_multiplier: '3x',
    },
    design: {
      model: 'claude-opus-4-6',
      mode: 'plan',
      thinking: true,
      rationale: 'Design requires architectural judgment across multiple files.',
      evidence_id: 'arXiv:2509.16941',
      premium_multiplier: '3x',
    },
    tasks: {
      model: 'claude-sonnet-4-6',
      mode: 'plan',
      thinking: false,
      rationale: 'Task decomposition from approved spec is structured — Sonnet sufficient.',
      evidence_id: 'arXiv:2505.09027',
      premium_multiplier: '1x',
    },
    analyze: {
      model: 'claude-sonnet-4-6',
      mode: 'ask',
      thinking: false,
      rationale: 'Cross-artifact analysis follows deterministic rules — no reasoning overhead needed.',
      evidence_id: 'arXiv:2509.11079',
      premium_multiplier: '1x',
    },
    implement: {
      model: 'claude-sonnet-4-6',
      mode: 'agent',
      thinking: false,
      rationale: 'Implementation is iterative with test feedback — extended thinking actively harmful.',
      evidence_id: 'arXiv:2502.08235',
      premium_multiplier: '1x',
    },
    verify: {
      model: 'claude-sonnet-4-6',
      mode: 'ask',
      thinking: false,
      rationale: 'Verification checks against clear criteria — structured task, Sonnet optimal.',
      evidence_id: 'arXiv:2604.02547',
      premium_multiplier: '1x',
    },
    release: {
      model: 'claude-haiku-4-5',
      mode: 'ask',
      thinking: false,
      rationale: 'Release artifacts (commit messages, PR descriptions, changelogs) need no reasoning depth.',
      evidence_id: 'arXiv:2603.05344',
      premium_multiplier: '0.33x',
    },
  };

  getHint(phase: string, signals?: ComplexitySignal): ModelRoutingHint {
    const base = ModelRoutingEngine.ROUTING_TABLE[phase] ?? ModelRoutingEngine.ROUTING_TABLE['implement']!;
    if (!signals) return base;

    // Complexity override: >10 files escalates to Opus for design/implement
    if (signals.file_count && signals.file_count > 10 &&
        (phase === 'design' || phase === 'implement')) {
      return {
        ...base,
        model: 'claude-opus-4-6',
        premium_multiplier: '3x',
        rationale: `Multi-file semantic complexity (${signals.file_count} files) exceeds Sonnet threshold — escalating to Opus.`,
        evidence_id: 'arXiv:2509.16941',
      };
    }
    return base;
  }

  getTable(): Array<{ phase: string } & ModelRoutingHint> {
    return Object.entries(ModelRoutingEngine.ROUTING_TABLE).map(([phase, hint]) => ({
      phase,
      ...hint,
    }));
  }

  calculateCostSavings(teamSize: number, requestsPerDay = 10): CostAnalysis {
    // Weighted average: ~60% Sonnet (1x), 30% Opus (3x), 10% Haiku (0.33x)
    const correctUnits = Math.round(
      teamSize * requestsPerDay * (0.6 * 1 + 0.3 * 3 + 0.1 * 0.33)
    );
    const opusOnlyUnits = teamSize * requestsPerDay * 3;
    const savingsPct = Math.round((1 - correctUnits / opusOnlyUnits) * 100);

    return {
      team_size: teamSize,
      requests_per_day: requestsPerDay,
      correct_routing_units: correctUnits,
      opus_only_units: opusOnlyUnits,
      savings_percent: savingsPct,
      savings_label: `Correct routing saves ~${savingsPct}% of premium spend vs Opus-for-everything.`,
    };
  }
}
