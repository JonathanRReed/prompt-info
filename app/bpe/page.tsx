import BpeDemo from '../../components/BpeDemo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BPE Token Visualizer - Byte Pair Encoding Demo',
  description: 'Interactive Byte Pair Encoding (BPE) demonstrator for GPT tokenization. Visualize how text is broken down into tokens using the GPT tokenizer.',
  keywords: ['BPE tokenizer', 'Byte Pair Encoding', 'GPT tokenizer', 'token visualization', 'tokenization demo', 'GPT tokens'],
  openGraph: {
    title: 'BPE Token Visualizer - Byte Pair Encoding Demo',
    description: 'Interactive Byte Pair Encoding (BPE) demonstrator for GPT tokenization.',
    url: 'https://prompt-info.helloworldfirm.com/bpe',
  },
  twitter: {
    title: 'BPE Token Visualizer - Byte Pair Encoding Demo',
    description: 'Interactive Byte Pair Encoding (BPE) demonstrator for GPT tokenization.',
  },
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/bpe',
  },
};

export default function BpePage() {
  return (
    <div>
      <BpeDemo />
    </div>
  );
}
