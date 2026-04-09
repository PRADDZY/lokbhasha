export type D1QueryResults<Row> = {
  results: Row[]
}

export type D1LikeStatement = {
  bind: (...values: unknown[]) => D1LikeStatement
  all: <Row = Record<string, unknown>>() => Promise<D1QueryResults<Row>>
  first: <Row = Record<string, unknown>>(columnName?: string) => Promise<Row | null>
  run: () => Promise<unknown>
}

export type D1LikeDatabase = {
  prepare: (query: string) => D1LikeStatement
}
