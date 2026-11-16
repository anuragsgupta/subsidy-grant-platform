import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { PasswordInput } from '../components/PasswordInput';
import { registerSchema } from '../schemas/register.schema';
import { authService } from '../../../services/auth.service';
import { ApiError } from '../../../services/api-client';
import type { RegisterFormValues } from '../../../types/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', fullName: '', email: '', phone: '' },
  });

  async function onSubmit(data: RegisterFormValues) {
    setSubmitError(null);
    try {
      await authService.register(data);
      toast.success('Registration successful. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors && err.fieldErrors.length > 0) {
        // Map backend fieldErrors to form fields
        for (const fe of err.fieldErrors) {
          setError(fe.field as keyof RegisterFormValues, { message: fe.message });
        }
      } else {
        const message = err instanceof ApiError ? err.message : 'Unable to connect to the server. Please try again.';
        setSubmitError(message);
      }
    }
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 py-8">
      {/* Government banner */}
      <div className="w-full max-w-lg mb-6">
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

      <Card className="w-full max-w-lg border-gov-border">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-text-primary">Beneficiary Registration</CardTitle>
          <p className="text-sm text-text-secondary">Create your GSDTS portal account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                aria-invalid={!!errors.fullName}
                {...registerField('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600" role="alert">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username <span className="text-red-500">*</span></Label>
              <Input
                id="username"
                type="text"
                placeholder="4–50 characters, letters, numbers, . _ -"
                aria-invalid={!!errors.username}
                {...registerField('username')}
              />
              {errors.username && (
                <p className="text-sm text-red-600" role="alert">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                {...registerField('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600" role="alert">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="Min 8 characters"
                aria-invalid={!!errors.password}
                {...registerField('password')}
              />
              <p className="text-xs text-text-secondary">
                Min 8 characters, must include at least one letter and one digit.
              </p>
              {errors.password && (
                <p className="text-sm text-red-600" role="alert">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone <span className="text-text-secondary text-xs font-normal">(optional)</span></Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210 or +919876543210"
                aria-invalid={!!errors.phone}
                {...registerField('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-red-600" role="alert">{errors.phone.message}</p>
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
                  Registering…
                </>
              ) : (
                'Register'
              )}
            </Button>

            <p className="text-center text-sm text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-gov-blue font-medium hover:underline">
                Back to Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
