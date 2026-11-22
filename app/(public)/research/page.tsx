import TopicList from '@/components/topic-list';
export const revalidate = 300;
export const metadata = { title: 'Research and publications', description: 'Research and publications from WealthOS Media.', alternates: { canonical: '/research' } };
export default function Research() { return <TopicList topic="research" />; }
