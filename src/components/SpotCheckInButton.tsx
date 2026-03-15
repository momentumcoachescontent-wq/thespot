import { motion } from "framer-motion";

const SpotCheckInButton = () => {
  const handleClick = () => {
    const msg = "¡Me dirijo al Spot! 🎙️ Espero verte ahí 🔥";
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className="fixed bottom-40 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-spot-lime shadow-[0_0_20px_rgba(200,255,0,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(200,255,0,0.8)]"
      title="Avisarles que vas al Spot"
    >
      {/* WhatsApp icon via SVG */}
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-black" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.547a.5.5 0 0 0 .609.61l5.77-1.51A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.881 9.881 0 0 1-5.031-1.373l-.361-.214-3.733.979.999-3.645-.235-.374A9.86 9.86 0 0 1 2.118 12C2.118 6.608 6.608 2.118 12 2.118c5.392 0 9.882 4.49 9.882 9.882 0 5.392-4.49 9.882-9.882 9.882z"/>
      </svg>
    </motion.button>
  );
};

export default SpotCheckInButton;
