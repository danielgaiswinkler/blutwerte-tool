import { bloodValues, categories, categoryLabels } from '../../data'

export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <p className="text-(--color-text-secondary) mb-8">
        Noch keine Blutwerte erfasst. Gehe zu "Werte eingeben" um deine erste Blutanalyse hinzuzufügen.
      </p>

      <h3 className="text-lg font-semibold mb-4">Verfügbare Kategorien ({bloodValues.length} Werte)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const count = bloodValues.filter(v => v.category === cat).length
          return (
            <div key={cat} className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-4">
              <h4 className="font-medium text-(--color-text-primary)">{categoryLabels[cat]}</h4>
              <p className="text-sm text-(--color-text-muted) mt-1">{count} Werte</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
