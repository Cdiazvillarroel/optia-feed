import { FlaskConical, BarChart3, Users, FileText } from 'lucide-react'

const reports = [
  { title: 'Formula Report', desc: 'Detailed formula breakdown with ingredient list, nutrient profile, cost breakdown, and mixing instructions', icon: FlaskConical },
  { title: 'Nutrition Audit', desc: 'Comprehensive farm nutrition review covering all animal groups, formula adequacy, and recommendations', icon: BarChart3 },
  { title: 'Cost Analysis', desc: 'Historical formula costs, ingredient price trends, and cost per unit of production over time', icon: BarChart3 },
  { title: 'Client Summary', desc: 'Monthly or quarterly nutrition report per client with performance tracking and formula changes', icon: Users },
]

export default function ReportsPage() {
  return (
    <div className="p-7 max-w-[1000px]">
      <h1 className="text-2xl font-bold text-text mb-5">Reports</h1>
      <div className="grid grid-cols-2 gap-3.5">
        {reports.map((r, i) => (
          <div key={i} className="card p-5 cursor-pointer hover:border-brand/25 transition-colors">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                <r.icon size={16} />
              </div>
              <span className="text-lg font-bold text-text-dim">{r.title}</span>
            </div>
            <p className="text-sm text-text-faint leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>
      <div className="card mt-6 p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <FileText size={16} className="text-brand" />
          <span className="text-lg font-bold text-text-dim">Export Formats</span>
        </div>
        <p className="text-sm text-text-faint">All reports can be exported as PDF (branded with your business logo) or Excel/CSV for further analysis.</p>
      </div>
    </div>
  )
}
