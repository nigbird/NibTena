
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Stethoscope, ArrowRight, Star, Building, Heart, Brain, Bone, Baby, Smile, Sparkles, Search, Hospital, CalendarCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Hospital as HospitalType, Doctor } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import Autoplay from "embla-carousel-autoplay";
import { placeholderImages, type ImagePlaceholder } from '@/lib/placeholder-images';

const actionIcons: { [key: string]: React.ElementType } = {
  Hospital: Hospital,
  Stethoscope: Stethoscope,
  CalendarCheck: CalendarCheck,
  User: UserIcon,
}

const specialtyIcons: { [key: string]: React.ElementType } = {
  Cardiology: Heart,
  Neurology: Brain,
  Pediatrics: Baby,
  Orthopedics: Bone,
  Dentistry: Smile,
  Dermatology: Sparkles,
};


type SearchResult = {
  doctors: Doctor[];
  hospitals: HospitalType[];
  specialties: string[];
};

function Highlight({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span className="text-foreground/80">{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className="text-foreground/80">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className="font-bold text-foreground bg-primary/20 rounded-sm">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  );
}

type UserHomepageClientProps = {
    heroImage?: ImagePlaceholder;
    quickActions: { href: string; label: string; icon: string; color: string; }[];
    topHospitals: HospitalType[];
    featuredDoctors: Doctor[];
    allData: { doctors: Doctor[]; hospitals: HospitalType[]; specialties: string[] };
}

export default function UserHomepageClient({ heroImage, quickActions, topHospitals, featuredDoctors, allData }: UserHomepageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const [hospitalApi, setHospitalApi] = useState<any>();
  const [doctorApi, setDoctorApi] = useState<any>();
  const [currentHospitalSlide, setCurrentHospitalSlide] = useState(0);
  const [currentDoctorSlide, setCurrentDoctorSlide] = useState(0);

  const router = useRouter();
  
  useEffect(() => {
    if (!hospitalApi) return;
    setCurrentHospitalSlide(hospitalApi.selectedScrollSnap());
    hospitalApi.on("select", () => {
      setCurrentHospitalSlide(hospitalApi.selectedScrollSnap());
    });
  }, [hospitalApi]);

  useEffect(() => {
    if (!doctorApi) return;
    setCurrentDoctorSlide(doctorApi.selectedScrollSnap());
    doctorApi.on("select", () => {
      setCurrentDoctorSlide(doctorApi.selectedScrollSnap());
    });
  }, [doctorApi]);


  useEffect(() => {
    if (debouncedSearchQuery) {
      setShowResults(true);
      setIsSearching(true);
      const lowercasedQuery = debouncedSearchQuery.toLowerCase();
      
      const filteredHospitals = allData.hospitals.filter(h => h.name.toLowerCase().includes(lowercasedQuery));
      const filteredDoctors = allData.doctors.filter(d => d.name.toLowerCase().includes(lowercasedQuery));
      const filteredSpecialties = allData.specialties.filter(s => s.toLowerCase().includes(lowercasedQuery));

      setSearchResults({
        hospitals: filteredHospitals,
        doctors: filteredDoctors,
        specialties: filteredSpecialties,
      });
      setIsSearching(false);
    } else {
      setShowResults(false);
      setSearchResults(null);
    }
  }, [debouncedSearchQuery, allData]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowResults(false);
      router.push(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  const handleSuggestionClick = (name: string, url: string) => {
    setSearchQuery(name);
    setShowResults(false);
    router.push(url);
  };
  
  const hasResults = searchResults && (searchResults.doctors.length > 0 || searchResults.hospitals.length > 0 || searchResults.specialties.length > 0);

  return (
    <div className="flex flex-col">
      <div className="relative">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="relative p-6 space-y-8 bg-gradient-to-b from-black/60 to-transparent">
        
          <section className="space-y-4 pt-8 pb-16 text-white text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                  How are you feeling today?
              </h1>
              <p className="text-white/90">Find the best doctors and hospitals near you.</p>
              <div className="relative max-w-lg mx-auto">
                <form onSubmit={handleSearchSubmit}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                    <Input
                        type="search"
                        placeholder="Search doctors, hospitals, or specialties…"
                        className="w-full h-14 rounded-full bg-background/90 text-foreground pl-12 pr-4 text-base shadow-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                        onFocus={() => { if (debouncedSearchQuery) setShowResults(true); }}
                    />
                </form>
                {showResults && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl bg-background border shadow-lg overflow-hidden text-left">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">Searching...</div>
                    ) : hasResults ? (
                      <ul className="divide-y max-h-96 overflow-y-auto">
                        {searchResults.specialties.length > 0 && (
                          <>
                            <li className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground bg-muted/50">Specialties</li>
                            {searchResults.specialties.map(specialty => {
                              const Icon = specialtyIcons[specialty] || Stethoscope;
                              return (
                                <li key={specialty}>
                                  <button onClick={() => handleSuggestionClick(specialty, `/user/doctors?specialty=${specialty}`)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                                    <Icon className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-medium"><Highlight text={specialty} highlight={debouncedSearchQuery} /></span>
                                  </button>
                                </li>
                              )
                            })}
                          </>
                        )}
                        {searchResults.hospitals.length > 0 && (
                          <>
                            <li className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground bg-muted/50">Hospitals</li>
                            {searchResults.hospitals.map(hospital => (
                              <li key={`h-${hospital.id}`}>
                                <button onClick={() => handleSuggestionClick(hospital.name, `/user/hospitals/${hospital.id}`)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                                  <Avatar className="h-8 w-8 rounded-md"><AvatarFallback><Building/></AvatarFallback></Avatar>
                                  <div>
                                    <p className="text-sm font-medium"><Highlight text={hospital.name} highlight={debouncedSearchQuery} /></p>
                                    <p className="text-xs text-muted-foreground">{hospital.city}</p>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </>
                        )}
                        {searchResults.doctors.length > 0 && (
                          <>
                            <li className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground bg-muted/50">Doctors</li>
                            {searchResults.doctors.map(doctor => (
                              <li key={`d-${doctor.id}`}>
                                <button onClick={() => handleSuggestionClick(doctor.name, `/user/doctors/${doctor.id}`)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                                  <Avatar className="h-8 w-8"><AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback></Avatar>
                                  <div>
                                    <p className="text-sm font-medium"><Highlight text={doctor.name} highlight={debouncedSearchQuery} /></p>
                                    <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No results for "{debouncedSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
          </section>
        </div>
      </div>
      
       <div className="-mt-12 relative pb-4 z-20">
          <section className="container mx-auto max-w-md">
              <div className="flex justify-around items-center">
                  {quickActions.map(({ href, label, icon, color }) => {
                      const Icon = actionIcons[icon] || Stethoscope;
                      return (
                      <Link href={href} key={label} className="flex flex-col items-center gap-2 group text-center p-2">
                          <div className={cn("relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg border-2 border-primary/20 hover:border-primary/60", color)}>
                              <Icon className="h-8 w-8 z-10 text-primary-foreground" />
                          </div>
                          <p className="text-xs font-semibold text-foreground transition-transform group-hover:-translate-y-0.5">{label}</p>
                      </Link>
                  )})}
              </div>
          </section>
      </div>

      <section className="py-8 space-y-4">
          <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
              <h2 className="font-headline text-2xl font-bold">Top Hospitals</h2>
              <Link href="/user/hospitals" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                  See all <ArrowRight className="h-4 w-4" />
              </Link>
          </div>
          <Carousel
            setApi={setHospitalApi}
            opts={{ align: 'start', loop: true }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
            className="w-full"
          >
              <CarouselContent className="-ml-4 px-6">
                  {topHospitals.map(hospital => {
                      const hospitalImage = placeholderImages.find(p => p.id === hospital.imageId);
                      return (
                          <CarouselItem key={hospital.id} className="md:basis-1/2 lg:basis-1/3 group">
                              <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
                                  {hospitalImage && (
                                      <div className="aspect-video relative overflow-hidden">
                                          <Image
                                              src={hospitalImage.imageUrl}
                                              alt={hospital.name}
                                              fill
                                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                                          />
                                      </div>
                                  )}
                                  <CardContent className="p-4">
                                      <h3 className="font-bold font-headline">{hospital.name}</h3>
                                      <p className="text-sm text-muted-foreground">{hospital.city} | Multi-Specialty Care</p>
                                      <Button asChild variant="link" className="p-0 h-auto mt-2">
                                          <Link href={`/user/hospitals/${hospital.id}`}>
                                              View Details <ArrowRight className="ml-1 h-4 w-4" />
                                          </Link>
                                      </Button>
                                  </CardContent>
                              </Card>
                          </CarouselItem>
                      );
                  })}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
          </Carousel>
           <div className="py-2 flex justify-center gap-2">
            {topHospitals.map((_, index) => (
              <button
                key={index}
                onClick={() => hospitalApi?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentHospitalSlide ? "p-1 bg-accent" : "bg-accent/30"
                )}
              />
            ))}
          </div>
      </section>

      <section className="py-8 space-y-4 bg-muted/20">
            <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
              <h2 className="font-headline text-2xl font-bold">Featured Doctors</h2>
              <Link href="/user/doctors" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                  See all <ArrowRight className="h-4 w-4" />
              </Link>
          </div>
          <Carousel
            setApi={setDoctorApi}
            opts={{ align: 'start', loop: true }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
            className="w-full"
          >
              <CarouselContent className="-ml-4 px-6">
                  {featuredDoctors.map(doctor => {
                      const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);
                      return (
                            <CarouselItem key={doctor.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                              <Card className="overflow-hidden text-center transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col items-center p-4 h-full">
                                  <Avatar className="h-24 w-24 mb-4 border-2 shadow-md" style={{ borderColor: 'hsl(var(--accent))' }}>
                                      {doctorImage && (
                                          <AvatarImage src={doctorImage.imageUrl} alt={doctor.name} />
                                      )}
                                      <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="p-3 pt-0 flex flex-col flex-grow justify-between">
                                      <div>
                                        <h3 className="font-bold text-sm truncate">{doctor.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{doctor.specialty}</p>
                                      </div>
                                      <Button asChild size="sm" className="mt-4 w-full transition-transform hover:scale-105 font-medium text-base" variant="primary">
                                          <Link href={`/user/doctors/${doctor.id}`}>Book Now</Link>
                                      </Button>
                                  </div>
                              </Card>
                          </CarouselItem>
                      );
                  })}
              </CarouselContent>
               <CarouselPrevious className="left-2" />
               <CarouselNext className="right-2" />
          </Carousel>
           <div className="py-2 flex justify-center gap-2">
            {featuredDoctors.map((_, index) => (
              <button
                key={index}
                onClick={() => doctorApi?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentDoctorSlide ? "p-1 bg-accent" : "bg-accent/30"
                )}
              />
            ))}
          </div>
      </section>
    </div>
  );
}
