import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gov-border">
        <CardHeader className="text-center">
          <div className="text-2xl font-bold text-primary-navy mb-2">GSDTS</div>
          <CardTitle className="text-xl text-text-primary">Register</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-secondary text-center">Authentication coming in Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
