import type { Metadata } from 'next';
import AgentPlannerClient from './planner-client';
export const metadata: Metadata = { title: 'Agent Run Budget Planner | Prompt Info', description: 'Explore input, output, thinking and caching costs for an autonomous agent run.', robots: { index: false, follow: false } };
export default function Page() { return <main id="main-content"><AgentPlannerClient /></main>; }
