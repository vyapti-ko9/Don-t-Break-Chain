/**
 * Headless reachability / solvability check for compiled levels.
 * Approximates GameEngine activation rules (edges, reverse, merger, explosive).
 * Run: npx --yes tsx scripts/validate-levels.ts
 */
import { LEVELS } from '../src/data/levels';
import type { LevelDef, NodeDef, EdgeDef } from '../src/game/types';

type SimNode = {
  id: string;
  def: NodeDef;
  type: string;
  required: boolean;
  isStart: boolean;
  x: number;
  y: number;
  active: boolean;
  received: number;
  incoming: number;
  fired: boolean;
};

function dist(a: SimNode, b: SimNode) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function simulate(level: LevelDef): { ok: boolean; reason?: string; activated: number; required: number } {
  const nodes: SimNode[] = level.nodes.map((d) => ({
    id: d.id,
    def: d,
    type: d.type,
    required: d.required ?? (d.type !== 'fake' && d.type !== 'bomb'),
    isStart: !!d.start,
    x: d.x,
    y: d.y,
    active: false,
    received: 0,
    incoming: 0,
    fired: false,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const realEdges = level.edges.filter((e) => !e.fake);
  const outgoing = new Map<string, EdgeDef[]>();
  const incoming = new Map<string, EdgeDef[]>();
  for (const e of realEdges) {
    if (!outgoing.has(e.from)) outgoing.set(e.from, []);
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    outgoing.get(e.from)!.push(e);
    incoming.get(e.to)!.push(e);
  }
  for (const n of nodes) {
    n.incoming = (incoming.get(n.id) ?? []).length;
  }

  const starts = nodes.filter((n) => n.isStart);
  if (starts.length === 0) return { ok: false, reason: 'no starts', activated: 0, required: 0 };

  const queue: SimNode[] = [];

  const activate = (node: SimNode, viaExplosion = false) => {
    if (node.active) return;
    if (node.type === 'bomb') {
      throw new Error('bomb activated');
    }
    node.active = true;
    queue.push(node);
    if (node.type === 'explosive' && !viaExplosion) {
      const radius = node.def.radius ?? 0.22;
      for (const other of nodes) {
        if (other === node || other.active || other.type === 'bomb') continue;
        if (dist(node, other) <= radius) {
          activate(other, true);
        }
      }
    }
  };

  const propagate = (node: SimNode) => {
    if (node.fired) return;
    node.fired = true;
    const list =
      node.type === 'reverse'
        ? (incoming.get(node.id) ?? []).map((e) => ({ edge: e, targetId: e.from }))
        : (outgoing.get(node.id) ?? []).map((e) => ({ edge: e, targetId: e.to }));

    for (const { targetId } of list) {
      const target = byId.get(targetId);
      if (!target) continue;
      if (target.type === 'bomb') throw new Error(`energy hit bomb ${targetId}`);
      if (target.active) continue;
      if (target.type === 'fake') continue;
      if (target.type === 'merger') {
        target.received += 1;
        if (target.received >= Math.max(1, target.incoming)) activate(target);
      } else {
        activate(target);
      }
    }
  };

  try {
    for (const s of starts) activate(s);
    // Process BFS-style; explosives may enqueue more during activate
    let guard = 0;
    while (queue.length && guard++ < 500) {
      const n = queue.shift()!;
      propagate(n);
    }
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
      activated: nodes.filter((n) => n.active).length,
      required: nodes.filter((n) => n.required).length,
    };
  }

  const required = nodes.filter((n) => n.required);
  const missing = required.filter((n) => !n.active);
  return {
    ok: missing.length === 0,
    reason: missing.length ? `unreached: ${missing.map((m) => m.id).join(',')}` : undefined,
    activated: nodes.filter((n) => n.active).length,
    required: required.length,
  };
}

let failed = 0;
for (const level of LEVELS) {
  const r = simulate(level);
  if (!r.ok) {
    failed++;
    console.log(`FAIL L${level.id} [${level.name}] w${level.world}: ${r.reason} (act ${r.activated}/${r.required})`);
  }
}
console.log(failed === 0 ? `OK: all ${LEVELS.length} levels solvable` : `FAILED: ${failed}/${LEVELS.length}`);
process.exit(failed === 0 ? 0 : 1);
