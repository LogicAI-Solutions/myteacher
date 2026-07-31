import React, { useEffect, useState } from 'react';
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
    console.log(`Iniciando assinatura do plano ${plan.name}`);
    navigate('/register', { state: { role: plan.role, planId: plan.id, planName: plan.name } });
  };

  if (loading) {
    return <Loading variant="fullscreen" text="Carregando planos..." />;
  }

  return (
    <div className="bg-gray-900 min-h-screen py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-400">Planos & Preços</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Escolha o plano ideal para você
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-300">
          Seja você um professor autônomo ou uma escola com vários professores, temos as ferramentas certas para o seu negócio.
        </p>

        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-0">
          {plans.map((plan, planIdx) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 xl:p-10 ${
                plan.popular ? 'bg-white/5 ring-2 ring-indigo-500' : 'ring-1 ring-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-x-4">
                <h3 id={plan.name} className="text-lg font-semibold leading-8 text-white">
                  {plan.name}
                </h3>
                {plan.popular && (
                  <p className="rounded-full bg-indigo-500 px-2.5 py-1 text-xs font-semibold leading-5 text-white">
                    Mais Popular
                  </p>
                )}
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-300">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-white">{plan.price}</span>
                <span className="text-sm font-semibold leading-6 text-gray-300">{plan.period}</span>
              </p>
              <button
                onClick={() => handleSubscribe(plan)}
                className={`mt-6 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  plan.popular
                    ? 'bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline-indigo-500'
                    : 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white'
                }`}
              >
                {plan.button_text}
              </button>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300 xl:mt-10">
                {plan.features?.map((feature, idx) => (
                  <li key={idx} className="flex gap-x-3">
                    {feature.included ? (
                      <Check className="h-6 w-5 flex-none text-indigo-400" aria-hidden="true" />
                    ) : (
                      <X className="h-6 w-5 flex-none text-gray-500" aria-hidden="true" />
                    )}
                    <span className={!feature.included ? 'text-gray-500' : ''}>{feature.text}</span>
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
