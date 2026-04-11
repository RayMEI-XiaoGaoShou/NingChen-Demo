import { describe, expect, it } from 'vitest'
import { INITIAL_RELATIONSHIP_EDGES, RELATIONSHIP_STRUCTURES } from '../data/npcRelationships'
import { applyRelationshipShock } from './relationshipEngine'

describe('relationshipEngine', () => {
    it('breaks a key triangle when a relationship edge drops below threshold', () => {
        const result = applyRelationshipShock({
            edges: INITIAL_RELATIONSHIP_EDGES,
            structures: RELATIONSHIP_STRUCTURES,
            edgeId: 'hebabogui_duguwenyue_competition',
            delta: -1.3,
            source: 'alienate',
        })

        expect(result.triggeredStructures.map(structure => structure.id)).toContain('west_command_triangle')
        expect(result.reports[0]?.structureId).toBe('west_command_triangle')
        expect(result.edges.find(edge => edge.id === 'hebabogui_duguwenyue_competition')?.strength).toBeLessThanOrEqual(-0.8)
    })
})
