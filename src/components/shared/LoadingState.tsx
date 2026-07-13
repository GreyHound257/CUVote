import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground animate-in fade-in duration-500">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function LoadingTableState({ columnCount = 5, rowCount = 5 }: { columnCount?: number, rowCount?: number }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <td key={colIndex} className="p-4">
              <div className="h-4 bg-muted rounded-md w-full"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
