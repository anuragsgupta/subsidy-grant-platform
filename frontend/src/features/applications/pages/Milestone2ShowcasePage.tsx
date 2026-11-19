import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Circle, ClipboardCheck, FilePlus2, Landmark, UsersRound } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { applicationService } from '../services/application.service';

const steps = [
	{
		title: 'Select or register a beneficiary',
		description:
			'Find an existing applicant or create a profile in the beneficiary registry.',
		href: '/admin/beneficiaries',
		icon: UsersRound,
	},
	{
		title: 'Review an open scheme',
		description:
			'Check the published scheme rules, dates, status, and grant range.',
		href: '/schemes',
		icon: Landmark,
	},
	{
		title: 'Submit an application',
		description:
			'Choose a beneficiary and scheme, then submit the grant request.',
		href: '/applications/new',
		icon: FilePlus2,
	},
	{
		title: 'Review the verification queue',
		description:
			'Open the queue and inspect the submitted application and its audit events.',
		href: '/verification',
		icon: ClipboardCheck,
	},
];

export default function Milestone2ShowcasePage() {
	const query = useQuery({
		queryKey: ['applications', 'milestone-showcase'],
		queryFn: () => applicationService.list(),
	});
	const latest = query.data?.content[0];
	return (
		<main className="mx-auto w-full max-w-6xl space-y-8 p-6">
			<header className="rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-8 text-white">
				<p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
					Milestone 2 · Live API walkthrough
				</p>
				<h1 className="mt-3 text-3xl font-semibold md:text-4xl">
					From beneficiary to verified grant
				</h1>
				<p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
					Walk through registry, scheme discovery, application submission, and
					verification using the configured backend. Each step opens the real
					API-backed feature screens.
				</p>
				<div className="mt-6 flex flex-wrap gap-3">
					<Button
						asChild
						className="bg-white text-blue-950 hover:bg-blue-50"
					>
						<Link to="/applications/new">
							Start the flow <ArrowRight />
						</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						className="border-white/40 bg-transparent text-white hover:bg-white/10"
					>
						<Link to="/applications">Application register</Link>
					</Button>
				</div>
			</header>
			<section className="grid gap-4 md:grid-cols-2">
				{steps.map((step, index) => {
					const Icon = step.icon;
					return (
						<article
							key={step.href}
							className="flex gap-4 rounded-xl border bg-white p-5 shadow-sm"
						>
							<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
								<Icon size={21} />
							</div>
							<div className="flex-1">
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Step {index + 1}
								</p>
								<h2 className="mt-1 font-semibold">{step.title}</h2>
								<p className="mt-1 text-sm text-slate-600">
									{step.description}
								</p>
								<Link
									className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
									to={step.href}
								>
									Open step <ArrowRight size={14} />
								</Link>
							</div>
						</article>
					);
				})}
			</section>
			<section className="rounded-xl border bg-white p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold">Latest application status</h2>
						<p className="mt-1 text-sm text-slate-600">
							Fetched from GET /applications — refreshes automatically after API
							writes.
						</p>
					</div>
					<Link
						className="text-sm font-medium text-blue-700 hover:underline"
						to="/verification"
					>
						Open verification queue →
					</Link>
				</div>
				{query.isLoading && (
					<p className="mt-4 text-sm text-slate-500">
						Loading live application status…
					</p>
				)}
				{query.isError && (
					<p role="alert" className="mt-4 text-sm text-red-700">
						Could not load applications. Check that the backend is available and
						your account is authorized.
					</p>
				)}
				{query.data && !latest && (
					<p className="mt-4 text-sm text-slate-600">
						No applications exist yet. Start the flow to create the first record.
					</p>
				)}
				{latest && (
					<div className="mt-5 grid gap-3 sm:grid-cols-4">
						<div>
							<p className="text-xs text-slate-500">Reference</p>
							<p className="font-semibold">{latest.referenceNo}</p>
						</div>
						<div>
							<p className="text-xs text-slate-500">Applicant</p>
							<p className="font-semibold">{latest.beneficiaryFullName}</p>
						</div>
						<div>
							<p className="text-xs text-slate-500">Status</p>
							<p className="font-semibold">
								{latest.status.replace(/_/g, ' ')}
							</p>
						</div>
						<div>
							<p className="text-xs text-slate-500">Next</p>
							<Link
								className="font-semibold text-blue-700 hover:underline"
								to={`/verification/${latest.id}`}
							>
								Review record
							</Link>
						</div>
					</div>
				)}
			</section>
			<section className="grid gap-4 md:grid-cols-2">
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
					<div className="flex items-center gap-2 font-semibold text-amber-950">
						<Circle size={17} /> Backend contract gaps
					</div>
					<p className="mt-2 text-sm leading-6 text-amber-900">
						The implemented backend does not currently expose eligibility
						score/results, verification-level assignment, decision comments,
						escalation endpoints/ownership, or per-application history. UI
						surfaces these values as pending or unavailable and does not
						fabricate business decisions.
					</p>
				</div>
				<div className="rounded-xl border bg-slate-50 p-5">
					<div className="flex items-center gap-2 font-semibold">
						<CheckCircle2
							size={17}
							className="text-emerald-700"
						/>{' '}
						API-connected steps
					</div>
					<p className="mt-2 text-sm leading-6 text-slate-600">
						Beneficiary, scheme, application, application status, and
						administrator audit endpoints use the existing authenticated API
						client. Backend status validation remains authoritative.
					</p>
				</div>
			</section>
		</main>
	);
}