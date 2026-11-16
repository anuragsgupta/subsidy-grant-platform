import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="text-text-secondary mt-1">{description}</p>
      </div>
      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-lg text-text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-secondary">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
