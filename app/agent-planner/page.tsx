import type { Metadata } from 'next';
import AgentPlannerClient from './planner-client';
export const metadata: Metadata = { title: 'Chat & Agent Budget Planner', description: 'Explore input, output, thinking and caching costs for an autonomous agent run.', robots: { index: false, follow: false } };
export default function Page() { return <main id="main-content" className="w-full min-w-0"><AgentPlannerClient /></main>; }
