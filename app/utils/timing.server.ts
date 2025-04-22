export type Timings = Record<
  string,
  Array<
    { desc?: string } & (
      | { time: number; start?: never }
      | { time?: never; start: number }
    )
  >
>;
