import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

export interface GraphiqueData {
  type: "bar" | "line" | "pie" | string;
  titre: string;
  labels: string[];
  donnees: number[];
  unite?: string;
}

interface Props {
  graphique: GraphiqueData;
}

const PRIMARY = "#378ADD";
const SECONDARY = "#1D9E75";
const PIE_PALETTE = [
  "#378ADD",
  "#1D9E75",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

const ExerciseChart = ({ graphique }: Props) => {
  const { type, titre, labels, donnees, unite } = graphique;

  const data = useMemo(() => {
    if (type === "pie") {
      return {
        labels,
        datasets: [
          {
            data: donnees,
            backgroundColor: labels.map((_, i) => PIE_PALETTE[i % PIE_PALETTE.length]),
            borderColor: "#fff",
            borderWidth: 2,
          },
        ],
      };
    }
    if (type === "line") {
      return {
        labels,
        datasets: [
          {
            label: unite || titre,
            data: donnees,
            borderColor: PRIMARY,
            backgroundColor: `${PRIMARY}33`,
            borderWidth: 2,
            tension: 0.3,
            pointBackgroundColor: SECONDARY,
            pointRadius: 4,
          },
        ],
      };
    }
    return {
      labels,
      datasets: [
        {
          label: unite || titre,
          data: donnees,
          backgroundColor: PRIMARY,
          borderColor: PRIMARY,
          borderRadius: 6,
        },
      ],
    };
  }, [type, labels, donnees, titre, unite]);

  const options = useMemo(() => {
    const base: Record<string, unknown> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: type === "pie", position: "bottom" as const },
        title: { display: !!titre, text: titre, font: { size: 14, weight: "bold" as const } },
        tooltip: {
          callbacks: {
            label: (ctx: { parsed: number | { y: number }; label?: string }) => {
              const v = typeof ctx.parsed === "number" ? ctx.parsed : ctx.parsed?.y;
              return `${ctx.label ? ctx.label + " : " : ""}${v}${unite ? " " + unite : ""}`;
            },
          },
        },
      },
    };
    if (type !== "pie") {
      (base as { scales?: unknown }).scales = {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val: number | string) => `${val}${unite ? " " + unite : ""}`,
          },
        },
      };
    }
    return base;
  }, [type, titre, unite]);

  return (
    <div className="w-full h-64 sm:h-72">
      {type === "line" ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Line data={data as any} options={options as any} />
      ) : type === "pie" ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Pie data={data as any} options={options as any} />
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Bar data={data as any} options={options as any} />
      )}
    </div>
  );
};

export default ExerciseChart;