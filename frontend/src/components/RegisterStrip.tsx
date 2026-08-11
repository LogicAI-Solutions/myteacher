export type MonthStatus = 'paid' | 'pending' | 'late';

export interface RegisterStripMonth {
    label: string;
    status: MonthStatus;
}

interface RegisterStripProps {
    /** Aulas do período, na ordem. true = presente. */
    attendance: boolean[];
    months: RegisterStripMonth[];
}

const STAMP_CLASS: Record<MonthStatus, string> = {
    paid: 'stamp-paid',
    pending: 'stamp-pending',
    late: 'stamp-late',
};

const STATUS_WORD: Record<MonthStatus, string> = {
    paid: 'pago',
    pending: 'a receber',
    late: 'atrasado',
};

/**
 * A Faixa do Registro.
 *
 * O período corre da esquerda para a direita numa linha só. A presença não
 * escreve nada — a linha reta É a evidência de que está tudo certo — a falta
 * escreve uma marca de caneta, e a mensalidade carimba o mês embaixo. Ler a
 * faixa responde, sem clique, a única pergunta que o professor tem: este aluno
 * está vindo e está pagando?
 */
export const RegisterStrip = ({ attendance, months }: RegisterStripProps) => {
    const absences = attendance.filter(present => !present).length;

    const summary = [
        attendance.length > 0
            ? absences === 0
                ? `${attendance.length} aulas, nenhuma falta`
                : `${absences} falta${absences === 1 ? '' : 's'} em ${attendance.length} aulas`
            : 'Nenhuma aula registrada',
        ...months.map(m => `${m.label} ${STATUS_WORD[m.status]}`),
    ].join('. ');

    return (
        <div className="strip-track" role="img" aria-label={summary}>
            <span className="strip-rule" aria-hidden="true" />

            {attendance.map((present, i) =>
                present ? null : (
                    <i
                        key={i}
                        className="strip-miss"
                        aria-hidden="true"
                        style={{ left: `${((i + 0.5) / attendance.length) * 100}%` }}
                    />
                )
            )}

            {/* O único momento autoral do sistema: os carimbos assentam em
                sequência, da esquerda para a direita, como a mão que carimba
                mês a mês. */}
            {months.map((month, i) => (
                <b
                    key={month.label}
                    aria-hidden="true"
                    className={`strip-month animate-stamp ${STAMP_CLASS[month.status]}`}
                    style={{
                        left: `${(i / months.length) * 100}%`,
                        width: `calc(${100 / months.length}% - 4px)`,
                        animationDelay: `${i * 90}ms`,
                        animationFillMode: 'backwards',
                    }}
                >
                    {month.label}
                </b>
            ))}
        </div>
    );
};
