/**
 * "+1" after an arrival time when the flight lands on a later day than it
 * departs (e.g. 22:55 → 00:35⁺¹). Renders nothing for same-day arrivals.
 */
export default function ArrivalDayOffset({ offset }: { offset?: number }) {
  if (!offset || offset <= 0) return null;
  return (
    <>
      <sup
        className="ml-0.5 align-super text-[0.5em] font-black tracking-normal text-orange-600 dark:text-orange-400"
        aria-hidden="true"
        title={`隔 ${offset} 天抵達`}
      >
        +{offset}
      </sup>
      <span className="sr-only">（隔 {offset} 天抵達）</span>
    </>
  );
}
