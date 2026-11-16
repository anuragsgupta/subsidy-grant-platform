import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { PasswordInput } from '../components/PasswordInput';
import { loginSchema } from '../schemas/login.schema';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../../../services/auth.service';
import { ApiError } from '../../../services/api-client';
import { ROLE_DEFAULT_ROUTES } from '../../../types/auth';
import type { LoginFormValues } from '../../../types/auth';
import type { LocationState } from './types';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const from = (location.state as LocationState | null)?.from?.pathname ?? null;

  // Redirect already-authenticated users away from /login
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from ?? '/', { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(data: LoginFormValues) {
    setSubmitError(null);
    try {
      const token = await authService.login(data);
      const user = await login(token);
      const destination = from ?? ROLE_DEFAULT_ROUTES[user.role] ?? '/';
      toast.success('Login successful');
      navigate(destination, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to connect to the server. Please try again.';
      setSubmitError(message);
    }
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4">
      {/* Government banner */}
      <div className="w-full max-w-md mb-6">
        <div className="bg-primary-navy text-white px-6 py-4 rounded-t-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🏛️</span>
          </div>
          <div>
            <p className="text-xs text-white/70 font-medium">Government of India</p>
            <p className="text-sm font-bold tracking-wide">Ministry of Finance</p>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-md border-gov-border">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-text-primary">GSDTS Portal Login</CardTitle>
          <p className="text-sm text-text-secondary">Government Subsidy &amp; Disbursement Tracking System</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                aria-invalid={!!errors.username}
                {...registerField('username')}
              />
              {errors.username && (
                <p className="text-sm text-red-600" role="alert">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                {...registerField('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600" role="alert">{errors.password.message}</p>
              )}
            </div>

            {submitError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2" role="alert">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <p className="text-center text-sm text-text-secondary">
              New beneficiary?{' '}
              <Link to="/register" className="text-gov-blue font-medium hover:underline">
                Register here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
