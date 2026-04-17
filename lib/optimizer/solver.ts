// Type declarations for javascript-lp-solver
// The package ships without TypeScript types, so we declare a minimal shape here.

declare module 'javascript-lp-solver' {
  export interface LPModel {
    optimize: string
    opType: 'min' | 'max'
    constraints: Record<string, { min?: number; max?: number; equal?: number }>
    variables: Record<string, Record<string, number>>
    ints?: Record<string, 1>
    binaries?: Record<string, 1>
  }

  export interface LPSolution {
    feasible: boolean
    result: number
    bounded?: boolean
    [variable: string]: number | boolean | undefined
  }

  export function Solve(model: LPModel): LPSolution

  const solver: {
    Solve: typeof Solve
  }

  export default solver
}
