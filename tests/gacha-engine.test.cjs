const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const test = require('node:test')
const typescript = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020,
    },
  }).outputText
  module._compile(compiled, filename)
}

const { generateGachaOutfit, gachaOccasions } = require('../lib/gacha/gacha-engine.ts')
const { validateStrictOutfit } = require('../lib/outfit-validation.ts')

function item(id, category, status = 'Available', overrides = {}) {
  return {
    id,
    name: id,
    category,
    image: `/images/${id}.jpg`,
    imageAlt: id,
    color: 'Black',
    brand: 'Brand',
    seasons: ['All season'],
    styles: ['Casual'],
    price: 10,
    status,
    favorite: false,
    provenance: 'user',
    ...overrides,
  }
}

function input(items, overrides = {}) {
  return {
    items,
    occasion: 'Casual',
    weather: { availability: 'not-checked' },
    random: () => 0,
    ...overrides,
  }
}

function requireSuccess(result) {
  assert.equal(result.success, true)
  return result.candidate
}

test('generates dress and top-bottom base compositions', () => {
  const dress = requireSuccess(generateGachaOutfit(input([item('dress', 'Dresses')])))
  assert.equal(dress.baseComposition, 'dress')
  assert.deepEqual(dress.itemIds, ['dress'])

  const separates = requireSuccess(
    generateGachaOutfit(input([item('top', 'Tops'), item('bottom', 'Bottoms')])),
  )
  assert.equal(separates.baseComposition, 'top-bottom')
  assert.deepEqual(separates.itemIds, ['top', 'bottom'])
  const result = generateGachaOutfit(input([item('top', 'Tops'), item('bottom', 'Bottoms')]))
  assert.deepEqual(result.diagnostics.missingBaseCategories, [])
})

test('rejects empty wardrobe, laundry-only wardrobe, and incomplete base composition', () => {
  assert.equal(generateGachaOutfit(input([])).reason, 'empty-wardrobe')
  assert.equal(
    generateGachaOutfit(input([item('top', 'Tops', 'In laundry')])).reason,
    'no-eligible-items',
  )
  assert.equal(generateGachaOutfit(input([item('top', 'Tops')])).reason, 'no-eligible-base-composition')
})

test('excludes laundry and accepts Available and Worn recently records', () => {
  const candidate = requireSuccess(
    generateGachaOutfit(
      input([
        item('laundry-top', 'Tops', 'In laundry'),
        item('available-top', 'Tops'),
        item('worn-bottom', 'Bottoms', 'Worn recently'),
      ]),
    ),
  )
  assert.deepEqual(candidate.itemIds, ['available-top', 'worn-bottom'])
})

test('missing images do not exclude real wardrobe items', () => {
  const candidate = requireSuccess(
    generateGachaOutfit(
      input([
        item('top', 'Tops', 'Available', { image: '', imageAlt: '' }),
        item('bottom', 'Bottoms'),
      ]),
    ),
  )
  assert.deepEqual(candidate.itemIds, ['top', 'bottom'])
})

test('includes available shoes and exposes shoe-less readiness when none exist', () => {
  const withShoes = requireSuccess(
    generateGachaOutfit(input([item('top', 'Tops'), item('bottom', 'Bottoms'), item('shoe', 'Shoes')])),
  )
  assert.equal(withShoes.hasShoes, true)
  assert.equal(withShoes.shoeReadiness, 'with-shoes')

  const withoutShoes = requireSuccess(
    generateGachaOutfit(input([item('top', 'Tops'), item('bottom', 'Bottoms')])),
  )
  assert.equal(withoutShoes.hasShoes, false)
  assert.equal(withoutShoes.shoeReadiness, 'missing-shoes')
  assert.ok(withoutShoes.warnings.some(({ code }) => code === 'missing-shoes'))
})

test('prioritizes fresh shoes and permits Worn recently shoes when they are the only pair', () => {
  const fresh = requireSuccess(
    generateGachaOutfit(
      input(
        [
          item('top', 'Tops'),
          item('bottom', 'Bottoms'),
          item('worn-shoe', 'Shoes', 'Worn recently'),
          item('fresh-shoe', 'Shoes'),
        ],
        { recentlyWornItemIds: ['worn-shoe'] },
      ),
    ),
  )
  assert.ok(fresh.itemIds.includes('fresh-shoe'))

  const onlyWorn = requireSuccess(
    generateGachaOutfit(
      input(
        [item('top', 'Tops'), item('bottom', 'Bottoms'), item('shoe', 'Shoes', 'Worn recently')],
        { recentlyWornItemIds: ['shoe'] },
      ),
    ),
  )
  assert.ok(onlyWorn.itemIds.includes('shoe'))
  assert.equal(onlyWorn.antiRepeat.constraintsRelaxed, true)
})

test('outerwear and bags remain optional and accessories can be multiple', () => {
  const none = requireSuccess(
    generateGachaOutfit(
      input([
        item('top', 'Tops'),
        item('bottom', 'Bottoms'),
        item('coat', 'Outerwear'),
        item('bag', 'Bags'),
        item('a1', 'Accessories'),
        item('a2', 'Accessories'),
      ], { random: () => 0.99 }),
    ),
  )
  assert.deepEqual(none.itemIds, ['top', 'bottom'])

  const optional = requireSuccess(
    generateGachaOutfit(
      input([
        item('top', 'Tops'),
        item('bottom', 'Bottoms'),
        item('coat', 'Outerwear'),
        item('bag', 'Bags'),
        item('a1', 'Accessories'),
        item('a2', 'Accessories'),
      ]),
    ),
  )
  assert.ok(optional.itemIds.includes('coat'))
  assert.ok(optional.itemIds.includes('bag'))
  assert.ok(optional.itemIds.includes('a1'))
  assert.ok(optional.itemIds.includes('a2'))
})

test('reports duplicate IDs and excludes every ambiguous record', () => {
  const result = generateGachaOutfit(
    input([
      item('duplicate', 'Tops'),
      item('duplicate', 'Tops'),
      item('top', 'Tops'),
      item('bottom', 'Bottoms'),
    ]),
  )
  const candidate = requireSuccess(result)
  assert.deepEqual(candidate.itemIds, ['top', 'bottom'])
  assert.deepEqual(result.diagnostics.duplicateWardrobeIds, ['duplicate'])
})

test('reports malformed records without selecting them', () => {
  const malformed = { ...item('broken', 'Tops'), status: 'dirty' }
  const result = generateGachaOutfit(input([malformed, item('top', 'Tops'), item('bottom', 'Bottoms')]))
  const candidate = requireSuccess(result)
  assert.deepEqual(candidate.itemIds, ['top', 'bottom'])
  assert.equal(result.diagnostics.malformedWardrobeItemCount, 1)
  assert.ok(candidate.warnings.some(({ code }) => code === 'malformed-wardrobe-items'))
})

test('reports absent base categories when generation is impossible', () => {
  const result = generateGachaOutfit(input([item('top', 'Tops')]))
  assert.equal(result.success, false)
  assert.deepEqual(result.diagnostics.missingBaseCategories, ['Dresses', 'Bottoms'])
})

test('does not fabricate records or mutate input arrays and objects', () => {
  const wardrobe = Object.freeze([
    Object.freeze(item('top', 'Tops')),
    Object.freeze(item('bottom', 'Bottoms')),
  ])
  const before = JSON.stringify(wardrobe)
  const candidate = requireSuccess(generateGachaOutfit(input(wardrobe)))
  assert.deepEqual(candidate.items, wardrobe)
  assert.equal(JSON.stringify(wardrobe), before)
})

test('final candidates pass the shared strict validator with actual category slots', () => {
  const candidate = requireSuccess(
    generateGachaOutfit(
      input([
        item('dress', 'Dresses'),
        item('top', 'Tops'),
        item('bottom', 'Bottoms'),
        item('shoe', 'Shoes'),
      ]),
    ),
  )
  const validation = validateStrictOutfit(
    candidate.items.map((selected) => ({
      slot: selected.category,
      itemId: selected.id,
      item: selected,
    })),
  )
  assert.equal(validation.isValid, true)
})

test('shared strict validator rejects wrong category assignments', () => {
  const top = item('top', 'Tops')
  const result = validateStrictOutfit([
    { slot: 'Bottoms', itemId: top.id, item: top },
    { slot: 'Bottoms', itemId: 'bottom', item: item('bottom', 'Bottoms') },
  ])
  assert.equal(result.isValid, false)
  assert.ok(result.errors.some(({ code }) => code === 'category-slot-mismatch'))
})

test('shared strict validator rejects unresolved, duplicated, and incompatible references', () => {
  const top = item('top', 'Tops')
  const bottom = item('bottom', 'Bottoms')
  assert.ok(
    validateStrictOutfit([
      { slot: 'Tops', itemId: 'missing', item: null },
      { slot: 'Bottoms', itemId: bottom.id, item: bottom },
    ]).errors.some(({ code }) => code === 'missing-item'),
  )
  assert.ok(
    validateStrictOutfit([
      { slot: 'Tops', itemId: top.id, item: top },
      { slot: 'Tops', itemId: top.id, item: top },
      { slot: 'Bottoms', itemId: bottom.id, item: bottom },
    ]).errors.some(({ code }) => code === 'duplicate-item-id'),
  )
  assert.ok(
    validateStrictOutfit([
      { slot: 'Dresses', itemId: 'dress', item: item('dress', 'Dresses') },
      { slot: 'Tops', itemId: top.id, item: top },
    ]).errors.some(({ code }) => code === 'invalid-composition'),
  )
})

test('accepts all initial occasions and preserves all weather availability states', () => {
  for (const occasion of gachaOccasions) {
    for (const weather of [
      { availability: 'available' },
      { availability: 'unavailable' },
      { availability: 'not-checked' },
    ]) {
      const candidate = requireSuccess(
        generateGachaOutfit(input([item('top', 'Tops'), item('bottom', 'Bottoms')], {
          occasion,
          weather,
        })),
      )
      assert.equal(candidate.occasion, occasion)
      assert.deepEqual(candidate.weather, weather)
    }
  }
})

test('occasion and weather do not invent suitability or affect same-sequence selection', () => {
  const wardrobe = [item('top', 'Tops'), item('bottom', 'Bottoms')]
  const first = requireSuccess(
    generateGachaOutfit(input(wardrobe, {
      occasion: 'Work',
      weather: { availability: 'available' },
    })),
  )
  const second = requireSuccess(
    generateGachaOutfit(input(wardrobe, {
      occasion: 'Sport',
      weather: { availability: 'unavailable' },
    })),
  )
  assert.deepEqual(first.itemIds, second.itemIds)
})

test('prefers candidates that do not reuse recently worn items', () => {
  const candidate = requireSuccess(
    generateGachaOutfit(
      input(
        [
          item('worn-top', 'Tops'),
          item('fresh-top', 'Tops'),
          item('bottom', 'Bottoms'),
        ],
        { recentlyWornItemIds: ['worn-top'] },
      ),
    ),
  )
  assert.ok(candidate.itemIds.includes('fresh-top'))
  assert.equal(candidate.antiRepeat.avoidedRecentlyWornItems, true)
})

test('avoids an immediate full-composition repeat when another base exists', () => {
  const candidate = requireSuccess(
    generateGachaOutfit(
      input(
        [
          item('top-1', 'Tops'),
          item('top-2', 'Tops'),
          item('bottom', 'Bottoms'),
        ],
        { previousCompositionItemIds: ['top-1', 'bottom'] },
      ),
    ),
  )
  assert.ok(candidate.itemIds.includes('top-2'))
  assert.equal(candidate.antiRepeat.avoidedPreviousComposition, true)
})

test('relaxes anti-repeat and reports it when the only composition must repeat', () => {
  const candidate = requireSuccess(
    generateGachaOutfit(
      input(
        [item('top', 'Tops'), item('bottom', 'Bottoms')],
        {
          recentlyWornItemIds: ['top'],
          previousCompositionItemIds: ['top', 'bottom'],
        },
      ),
    ),
  )
  assert.equal(candidate.antiRepeat.constraintsRelaxed, true)
  assert.ok(candidate.warnings.some(({ code }) => code === 'anti-repeat-relaxed'))
})

test('uses injected randomness deterministically and can select different valid results', () => {
  const wardrobe = [
    item('top-1', 'Tops'),
    item('top-2', 'Tops'),
    item('bottom-1', 'Bottoms'),
    item('bottom-2', 'Bottoms'),
  ]
  const first = requireSuccess(generateGachaOutfit(input(wardrobe, { random: () => 0 })))
  const repeat = requireSuccess(generateGachaOutfit(input(wardrobe, { random: () => 0 })))
  const other = requireSuccess(generateGachaOutfit(input(wardrobe, { random: () => 0.99 })))
  assert.deepEqual(first.itemIds, repeat.itemIds)
  assert.notDeepEqual(first.itemIds, other.itemIds)
})

test('invalid and throwing random sources fall back deterministically and are reported', () => {
  for (const random of [() => Number.NaN, () => 1, () => -1, () => { throw new Error('rng') }]) {
    const candidate = requireSuccess(
      generateGachaOutfit(input([item('top', 'Tops'), item('bottom', 'Bottoms')], { random })),
    )
    assert.ok(candidate.warnings.some(({ code }) => code === 'invalid-random-source'))
  }
})
