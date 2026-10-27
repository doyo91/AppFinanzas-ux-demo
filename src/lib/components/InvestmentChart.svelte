<script lang="ts">
	let { labels, series, positions, base = false, title }: { labels: string[]; positions?: number[]; series: { name: string; color: string; values: (number | null)[] }[]; base?: boolean; title: string } = $props();
	let values = $derived(series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
	let minimum = $derived(Math.min(100, ...values));
	let maximum = $derived(Math.max(100, ...values));
	let padding = $derived(Math.max(0.1, (maximum - minimum) * 0.1));
	let low = $derived(base ? minimum - padding : 0);
	let high = $derived(base ? maximum + padding : Math.max(1, ...values) * 1.05);
	let ticks = $derived([0, 1, 2, 3].map((tick) => low + ((high - low) * tick) / 3)
		.filter((value) => !base || Math.abs(value - 100) > (high - low) * 0.08));
	const x = (i: number) => positions && positions.length > 1 ? 64 + ((positions[i] - positions[0]) * 660) / (positions[positions.length - 1] - positions[0]) : 64 + (i * 660) / Math.max(1, labels.length - 1);
	const y = (value: number) => 205 - ((value - low) * 175) / (high - low);
	const label = (v: number) => base
		? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(Math.abs(v - 100) < 0.005 ? 0 : v - 100)} %`
		: `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v / 100)} €`;
</script>
<section class="panel investment-chart">
	<h2>{title}</h2>
	{#if values.length > 0}
		<svg viewBox="0 0 760 245" role="img" aria-label={title}>
			{#each ticks as value}
				<line x1="64" x2="724" y1={y(value)} y2={y(value)} stroke="#e1e7dc" />
				<text x="54" y={y(value) + 4} text-anchor="end">{label(value)}</text>
			{/each}
			{#if base}
				<line x1="64" x2="724" y1={y(100)} y2={y(100)} stroke="#60715b" stroke-width="2" />
				<text x="54" y={y(100) + 4} text-anchor="end" font-weight="700">0 %</text>
			{/if}
			{#each labels as name, i}<text x={x(i)} y="232" text-anchor="middle">{name}</text>{/each}
			{#each series as item}
				{#each item.values as value, i}
					{#if value !== null}
						{#if i > 0 && (!positions || positions[i] - positions[i - 1] === 1) && item.values[i - 1] !== null}<line x1={x(i - 1)} y1={y(item.values[i - 1]!)} x2={x(i)} y2={y(value)} stroke={item.color} stroke-width="2.5" />{/if}
						<circle cx={x(i)} cy={y(value)} r="3.5" fill={item.color}><title>{labels[i]} · {item.name}: {label(value)}</title></circle>
					{/if}
				{/each}
			{/each}
		</svg>
		<div class="chart-series">{#each series as item}<span><i style={`background:${item.color}`}></i>{item.name}</span>{/each}</div>
	{:else}<p>No hay valoraciones suficientes para dibujar este gráfico.</p>{/if}
	<p class="chart-note">{base ? 'Rentabilidad acumulada desde la primera valoración alineada del año; 0 % es el punto de partida. Referencias compuestas del 5 % y 9 % anual; no son previsiones. Aportaciones descontadas mediante Modified Dietz.' : 'Valoraciones declaradas por mes de referencia. Los huecos indican datos pendientes, no saldos de cero.'}</p>
</section>
<style>
	.investment-chart { padding: 24px; min-width: 0; }
	h2 { font-size: 17px; margin-bottom: 16px; }
	svg { width: 100%; height: auto; min-width: 520px; display: block; }
	.investment-chart { overflow-x: auto; }
	text { fill: #61735a; font: 11px sans-serif; }
	.chart-series { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; margin-top: 10px; }
	.chart-series span { display: flex; align-items: center; gap: 7px; }
	i { display: inline-block; width: 14px; height: 4px; border-radius: 2px; }
	.chart-note { font-size: 11px; line-height: 1.7; margin-top: 16px; }
</style>
