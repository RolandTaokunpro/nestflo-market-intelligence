/**
 * Coral "N" Nestflo mark from the approved design mockup.
 * Decorative: the wordmark next to it carries the accessible name.
 */
export default function LogoMark({ size = 21 }: { size?: number }) {
  return (
    <svg
      className="md-logo-mark"
      data-testid="md-logo"
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M39.3028 8.19104H14.491V23.0146H14.6263C17.2574 23.0146 19.7808 24.0598 21.6412 25.9202C23.5017 27.7807 24.5469 30.3041 24.5469 32.9352V33.0146H39.3028V8.19104Z"
        fill="#FF5943"
      />
      <path
        d="M14.4908 23.0146C12.5381 23.0413 10.6367 23.6438 9.02489 24.7465C7.41308 25.8492 6.16258 27.4031 5.43011 29.2134C4.69763 31.0238 4.51577 33.01 4.9073 34.9233C5.29884 36.8365 6.24636 38.5917 7.63112 39.9687C9.01588 41.3458 10.7763 42.2835 12.6917 42.6644C14.6071 43.0453 16.5923 42.8523 18.3986 42.1098C20.2048 41.3672 21.7517 40.1081 22.8454 38.4902C23.9391 36.8722 24.5309 34.9675 24.5467 33.0146H14.4908V23.0146Z"
        fill="#FF5943"
      />
    </svg>
  );
}
