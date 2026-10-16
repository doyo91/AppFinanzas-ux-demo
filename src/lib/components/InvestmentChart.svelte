<script lang="ts">
	let { labels, series, base = false, title }: { labels: string[]; series: { name: string; color: string; values: (number | null)[] }[]; base?: boolean; title: string } = $props();
	let values = $derived(series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
	let low = $derived(base ? Math.min(95, ...values) : 0);
	let high = $derived(Math.max(low + 1, ...values) * 1.05);
	const x = (i: number) => 64 + (i * 660) / Math.max(1, labels.length - 1);
	const y = (value: number) => 205 - ((value - low) * 175) / (high - low);
	const label = (v: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: base ? 1 : 0 }).format(base ? v : v / 100);
</script>
<section class="panel investment-chart">
	<h2>{title}</h2>
	{#if values.length > 0}
		<svg viewBox="0 0 760 245" role="img" aria-label={title}>
			{#each [0, 1, 2, 3] as tick}
				{@const value = low + ((high - low) * tick) / 3}
				<line x1="64" x2="724" y1={y(value)} y2={y(value)} stroke="#e1e7dc" />
				<text x="54" y={y(value) + 4} text-anchor="end">{label(value)}{base ? '' : ' €'}</text>
			{/each}
			{#each labels as name, i}<text x={x(i)} y="232" text-anchor="middle">{name}</text>{/each}
			{#each series as item}
				{#each item.values as value, i}
					{#if value !== null}
						{#if i > 0 && item.values[i - 1] !== null}<line x1={x(i - 1)} y1={y(item.values[i - 1]!)} x2={x(i)} y2={y(value)} stroke={item.color} stroke-width="2.5" />{/if}
						<circle cx={x(i)} cy={y(value)} r="3.5" fill={item.color}><title>{labels[i]} · {item.name}: {label(value)}{base ? '' : ' €'}</title></circle>
					{/if}
				{/each}
			{/each}
		</svg>
		<div class="chart-series">{#each series as item}<span><i style={`background:${item.color}`}></i>{item.name}</span>{/each}</div>
	{:else}<p>No hay valoraciones suficientes para dibujar este gráfico.</p>{/if}
	<p class="chart-note">{base ? 'Base 100 desde la primera valoración alineada del año. Referencias compuestas del 5 % y 9 % anual; no son previsiones. Aportaciones descontadas mediante Modified Dietz.' : 'Valoraciones declaradas por mes de referencia. Los huecos indican datos pendientes, no saldos de cero.'}</p>
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
