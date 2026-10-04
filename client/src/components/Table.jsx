export default function Table({ columns = [], data = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-ice100 text-secondaryText">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ice100">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-ice50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-darkText">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-mutedText">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
