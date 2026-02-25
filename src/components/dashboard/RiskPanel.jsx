import Card from '../common/Card'

export default function RiskPanel({ risk }) {
  if (!risk) return <Card title="Risk Assessment">No risk analysis yet.</Card>
  return (
    <Card title="Risk Assessment">
      <p className="text-sm"><strong>Risk Level:</strong> {risk.riskLevel || 'unknown'}</p>
      <p className="mt-2 text-sm"><strong>Summary:</strong> {risk.summary || 'No summary available.'}</p>
      <ul className="mt-3 list-disc pl-5 text-sm">
        {(risk.activeThreats || []).map((threat, index) => (
          <li key={index}>{typeof threat === 'string' ? threat : JSON.stringify(threat)}</li>
        ))}
      </ul>
    </Card>
  )
}