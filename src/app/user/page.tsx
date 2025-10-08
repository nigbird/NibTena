'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Hospital, Stethoscope, CalendarCheck, User as UserIcon, Search, ArrowRight, Star, Building, Heart, Brain, Bone, Baby, Smile, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getHospitals, getDoctors, getSpecialties, getHospitalById } from '@/lib/data';
import type { Hospital as HospitalType, Doctor } from '@/lib/definitions';
import { placeholderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';

const quickActions = [
  { href: '/user/hospitals', label: 'Hospitals', icon: Hospital, color: 'bg-blue-100 text-blue-600' },
  { href: '/user/doctors', label: 'Doctors', icon: Stethoscope, color: 'bg-green-100 text-green-600' },
  { href: '/user/appointments', label: 'Bookings', icon: CalendarCheck, color: 'bg-violet-100 text-violet-600' },
  { href: '/user/profile', label: 'Profile', icon: UserIcon, color: 'bg-orange-100 text-orange-600' },
];

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
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="font-bold text-primary-foreground bg-primary/20 rounded-sm">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}


export default function Home() {
  const [topHospitals, setTopHospitals] = useState<HospitalType[]>([]);
  const [featuredDoctors, setFeaturedDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allData, setAllData] = useState<{ doctors: Doctor[]; hospitals: HospitalType[]; specialties: string[] }>({ doctors: [], hospitals: [], specialties: [] });

  const router = useRouter();

  useEffect(() => {
    async function fetchAllData() {
      const [hospitalsData, doctorsData, specialtiesData] = await Promise.all([
        getHospitals(),
        getDoctors(),
        getSpecialties(),
      ]);
      setTopHospitals(hospitalsData.slice(0, 5));
      setFeaturedDoctors(doctorsData.filter(d => d.rating > 4.7).slice(0, 5));
      setAllData({ hospitals: hospitalsData, doctors: doctorsData, specialties: specialtiesData });
    }
    fetchAllData();
  }, []);

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
      <div className="p-6 space-y-8 bg-muted/20">
        
        <section className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-center">
                How are you feeling today?
            </h1>
             <p className="text-center text-muted-foreground">Find the best doctors and hospitals near you.</p>
            <div className="relative max-w-lg mx-auto">
              <form onSubmit={handleSearchSubmit}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Search doctors, hospitals, or specialties…"
                      className="w-full h-14 rounded-full bg-background pl-12 pr-4 text-base shadow-md"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => setTimeout(() => setShowResults(false), 200)}
                      onFocus={() => { if (debouncedSearchQuery) setShowResults(true); }}
                  />
              </form>
               {showResults && (
                <div className="absolute z-10 mt-2 w-full rounded-xl bg-background border shadow-lg overflow-hidden">
                  {isSearching ? (
                    <div className="p-4 text-center text-muted-foreground">Searching...</div>
                  ) : hasResults ? (
                    <ul className="divide-y">
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

        {/* Quick Actions Section */}
        <section>
            <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-md mx-auto">
                 {quickActions.map(({ href, label, icon: Icon, color }) => (
                    <Link href={href} key={label} className="flex flex-col items-center gap-2 group text-center">
                        <div className={cn("relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-md transition-all duration-300 group-hover:scale-110", color)}>
                            <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative h-14 w-14 rounded-xl bg-white/40 flex items-center justify-center backdrop-blur-sm group-hover:shadow-inner border-2 border-secondary/40">
                                <Icon className="h-7 w-7" />
                            </div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground transition-transform group-hover:-translate-y-0.5">{label}</p>
                    </Link>
                ))}
            </div>
        </section>

      </div>
        {/* Hospital Highlights Section */}
        <section className="py-8 space-y-4">
            <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
                <h2 className="font-headline text-2xl font-bold">Top Hospitals</h2>
                <Link href="/user/hospitals" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    See all <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <Carousel opts={{ align: 'start', loop: true }} className="w-full">
                <CarouselContent className="-ml-4 px-6">
                    {topHospitals.map(hospital => {
                        const hospitalImage = placeholderImages.find(p => p.id === hospital.imageId);
                        return (
                            <CarouselItem key={hospital.id} className="md:basis-1/2 lg:basis-1/3">
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
            </Carousel>
        </section>

        {/* Featured Doctors Section */}
        <section className="py-8 space-y-4 bg-muted/20">
             <div className="flex justify-between items-baseline px-6 mb-4 border-b pb-2">
                <h2 className="font-headline text-2xl font-bold">Featured Doctors</h2>
                <Link href="/user/doctors" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    See all <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
                <CarouselContent className="-ml-4 px-6">
                    {featuredDoctors.map(doctor => {
                        const doctorImage = placeholderImages.find(p => p.id === doctor.imageId);
                        return (
                             <CarouselItem key={doctor.id} className="basis-2/5 sm:basis-1/3 md:basis-1/4">
                                <Card className="overflow-hidden text-center transition-transform hover:-translate-y-1 hover:shadow-lg flex flex-col items-center p-4">
                                    <Avatar className="h-24 w-24 mb-4 border-2 shadow-md" style={{ borderColor: '#b59b7d' }}>
                                        {doctorImage && (
                                            <AvatarImage src={doctorImage.imageUrl} alt={doctor.name} />
                                        )}
                                        <AvatarFallback><UserIcon /></AvatarFallback>
                                    </Avatar>
                                    <div className="p-3 pt-0">
                                        <h3 className="font-bold text-sm truncate">{doctor.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">{doctor.specialty}</p>
                                        <Button asChild size="sm" className="mt-4 w-full transition-transform hover:scale-105 font-medium text-base" variant="brand">
                                            <Link href={`/user/doctors/${doctor.id}`}>Book Now</Link>
                                        </Button>
                                    </div>
                                </Card>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
            </Carousel>
        </section>
    </div>
  );
}
