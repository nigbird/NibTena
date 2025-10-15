
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Building, Heart, Brain, Bone, Baby, Smile, Sparkles, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Hospital as HospitalType, Doctor } from '@prisma/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';

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
    allData: { doctors: Doctor[]; hospitals: HospitalType[]; specialties: string[] };
}

export default function UserHomepageClient({ allData }: UserHomepageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const router = useRouter();

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
    <div className="relative w-full max-w-lg mx-auto">
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
  );
}
