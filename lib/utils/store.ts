import { create } from 'zustand'

interface AiMessage {
  role: 'user' | 'assistant'
  text: string
}

interface AiStore {
  open: boolean
  messages: AiMessage[]
  toggle: () => void
  close: () => void
  addMessage: (msg: AiMessage) => void
}

export const useAiStore = create<AiStore>((set) => ({
  open: false,
  messages: [
    {
      role: 'assistant',
      text: "G'day! I'm Optia, your nutrition co-pilot. I can help review formulas, suggest ingredient substitutions, troubleshoot diet issues, or formulate new rations. What are you working on?",
    },
  ],
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
}))
