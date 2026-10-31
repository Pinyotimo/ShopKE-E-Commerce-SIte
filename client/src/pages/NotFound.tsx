import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Empty, Page } from '../ui';

export default function NotFound() {
  return <Page><Empty icon={Compass} title="Page not found"><Link to="/" className="mt-2 text-sm font-semibold text-emerald-700 hover:underline">Back to home</Link></Empty></Page>;
}