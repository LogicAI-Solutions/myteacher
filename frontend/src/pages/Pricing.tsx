import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Loading } from '../components/Loading';

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  period: string;
  features: { text: string; included: boolean }[];
  button_text: string;
  popular: boolean;
  role: string;
  max_classes: number;
  stripe_price_id?: string;
}

export default function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/plans/');
        setPlans(response.data);
      } catch (error) {
        console.error("Erro ao carregar planos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = (plan: Plan) => {
    navigate('/register', { state: { role: plan.role, planId: plan.id, planName: plan.name } });
  };

  if (loading) {
    return <Loading variant="fullscreen" text="Carregando planos..." />;
  }

  return (
    <div className="bg-bg-darker min-h-screen py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Planos & Preços</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-text-main sm:text-5xl">
            Escolha o plano ideal para você
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-text-muted">
          Seja você um professor autônomo ou uma escola com vários professores, temos as ferramentas certas para o seu negócio.
        </p>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-0">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`sheet p-8 xl:p-10 ${plan.popular ? 'border-primary' : ''}`}
            >
              <div className="flex items-center justify-between gap-x-4">
                <h3 id={plan.name} className="text-lg font-semibold leading-8 text-text-main">
                  {plan.name}
                </h3>
                {plan.popular && <span className="stamp stamp-paid">Mais escolhido</span>}
              </div>
              <p className="mt-4 text-sm leading-6 text-text-muted">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-text-main tabular">{plan.price}</span>
                <span className="text-sm font-semibold leading-6 text-text-muted">{plan.period}</span>
              </p>
              <button
                onClick={() => handleSubscribe(plan)}
                className={`btn w-full mt-6 py-2.5 justify-center ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
              >
                {plan.button_text}
              </button>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-text-muted xl:mt-10">
                {plan.features?.map((feature, idx) => (
                  <li key={idx} className="flex gap-x-3">
                    {feature.included ? (
                      <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                    ) : (
                      <X className="h-6 w-5 flex-none text-text-muted" aria-hidden="true" />
                    )}
                    <span className={!feature.included ? 'text-text-muted' : ''}>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
