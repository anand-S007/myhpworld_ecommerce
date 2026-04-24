import HeroCarousel from '../components/home/HeroCarousel.jsx';
import TrustMarquee from '../components/layout/TrustMarquee.jsx';
import CategoryGrid from '../components/home/CategoryGrid.jsx';
import OfferStrip from '../components/home/OfferStrip.jsx';
import DealOfTheDay from '../components/home/DealOfTheDay.jsx';
import FeaturedProducts from '../components/home/FeaturedProducts.jsx';
import BrandRibbon from '../components/home/BrandRibbon.jsx';
import StoreLocatorCTA from '../components/home/StoreLocatorCTA.jsx';
import WhyHpWorld from '../components/home/WhyHpWorld.jsx';
import Newsletter from '../components/home/Newsletter.jsx';

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <TrustMarquee />
      <CategoryGrid />
      <OfferStrip />
      <DealOfTheDay />
      <FeaturedProducts />
      {/* <BrandRibbon /> */}
      <StoreLocatorCTA />
      <WhyHpWorld />
      {/* <Newsletter /> */}
    </>
  );
}
