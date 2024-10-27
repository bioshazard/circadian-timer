import React, { useState, useEffect } from 'react';
import { Clock, Sun, Sunrise, Sunset, Moon, MapPin, RotateCcw } from 'lucide-react';

type Schedule = {
  wakeTime: Date;
  civilDawn: Date;
  sunrise: Date;
  sunset: Date;
  civilDusk: Date;
  toddlerBedTime: Date;
  adultBedTime: Date;
};

type ZipResponse = {
  places?: Array<{
    latitude: string;
    longitude: string;
    'place name': string;
    state: string;
  }>;
};

type SunResponse = {
  status: string;
  results: {
    sunrise: string;
    sunset: string;
  };
};

// Storage key constant
const ZIP_STORAGE_KEY = 'lastUsedZipCode';

// Inline components with mobile-first styles
const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-lg w-full mx-auto ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="p-4 md:p-6 border-b border-gray-200">
    {children}
  </div>
);

const CardTitle: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <h2 className="text-lg md:text-xl font-semibold flex items-center">
    {children}
  </h2>
);

const CardContent: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="p-4 md:p-6">
    {children}
  </div>
);

const Input: React.FC<{
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pattern?: string;
  maxLength?: number;
  className?: string;
}> = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2 text-base md:text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

const Button: React.FC<{
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}> = ({ children, className = '', variant = 'primary', ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-md flex items-center justify-center text-sm md:text-base transition-colors duration-200 ${
      variant === 'primary'
        ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
    } disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Alert: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}> = ({ children, variant = 'default' }) => (
  <div className={`p-3 rounded-md text-sm md:text-base ${
    variant === 'destructive' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
  }`}>
    {children}
  </div>
);

const SunSchedule: React.FC = () => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string>('');
  const [useZipCode, setUseZipCode] = useState<boolean>(false);
  const [location, setLocation] = useState<string>('');

  useEffect(() => {
    // Try to get saved ZIP code from localStorage
    const savedZip = localStorage.getItem(ZIP_STORAGE_KEY);
    if (savedZip) {
      setZipCode(savedZip);
      setUseZipCode(true);
      handleZipCodeSubmit(null, savedZip).catch(console.error);
    } else {
      getLocationAndSunData().catch(console.error);
    }
  }, []);

  const fetchZipCodeLocation = async (zip: string): Promise<{ latitude: number; longitude: number; location: string }> => {
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      const data: ZipResponse = await response.json();
      
      if (!data.places || data.places.length === 0) {
        throw new Error('Invalid zip code');
      }
      
      const locationStr = `${data.places[0]['place name']}, ${data.places[0].state}`;
      
      return {
        latitude: parseFloat(data.places[0].latitude),
        longitude: parseFloat(data.places[0].longitude),
        location: locationStr
      };
    } catch (err) {
      throw new Error('Invalid zip code. Please try again.');
    }
  };

  const fetchSunData = async (latitude: number, longitude: number): Promise<void> => {
    try {
      const response = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=today&formatted=0`
      );
      const data: SunResponse = await response.json();
      
      if (data.status === 'OK') {
        const sunriseTime = new Date(data.results.sunrise);
        const sunsetTime = new Date(data.results.sunset);
        const civilDawn = new Date(sunriseTime.getTime() - 35 * 60000);
        const civilDusk = new Date(sunsetTime.getTime() + 35 * 60000);
        const wakeTime = new Date(civilDawn.getTime() - 45 * 60000);
        const adultBedTime = new Date(sunsetTime.getTime() + 2.5 * 60 * 60000);
        const toddlerBedTime = new Date(wakeTime.getTime() - 11 * 60 * 60 * 1000);

        setSchedule({
          wakeTime,
          civilDawn,
          sunrise: sunriseTime,
          sunset: sunsetTime,
          civilDusk,
          adultBedTime,
          toddlerBedTime,
        });
        setError(null);
      }
    } catch (err) {
      throw new Error('Failed to fetch sun data. Please try again.');
    }
  };

  const handleZipCodeSubmit = async (e: React.FormEvent | null, overrideZip?: string) => {
    e?.preventDefault();
    const zipToUse = overrideZip || zipCode;
    
    setLoading(true);
    try {
      const { latitude, longitude, location } = await fetchZipCodeLocation(zipToUse);
      await fetchSunData(latitude, longitude);
      localStorage.setItem(ZIP_STORAGE_KEY, zipToUse);
      setLocation(location);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getLocationAndSunData = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, () => {
          reject(new Error('Location access denied. Please enter your zip code.'));
        });
      });
      
      await fetchSunData(position.coords.latitude, position.coords.longitude);
      setLocation('Current Location');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUseZipCode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(ZIP_STORAGE_KEY);
    setZipCode('');
    setUseZipCode(false);
    setLoading(true);
    getLocationAndSunData();
  };

  const formatTime = (date: Date | undefined): string => {
    return date?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) ?? '';
  };

  if (loading && !useZipCode) {
    return (
      <Card className="max-w-sm md:max-w-md lg:max-w-lg">
        <CardContent>
          <div className="flex items-center justify-center text-sm md:text-base">
            Loading sun data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-sm md:max-w-md lg:max-w-lg">
      <CardHeader>
        <CardTitle>
          <Sun className="h-5 w-5 md:h-6 md:w-6 mr-2" />
          Daily Light Exposure Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {(error || useZipCode) && (
            <form onSubmit={(e) => handleZipCodeSubmit(e)} className="space-y-3">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter ZIP code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    pattern="[0-9]{5}"
                    maxLength={5}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={loading || zipCode.length !== 5}
                    className="flex-1 md:flex-none"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Schedule
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={handleReset}
                    className="flex-1 md:flex-none"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Use Location
                  </Button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}
            </form>
          )}

          {schedule && (
            <div className="space-y-4">
              {location && (
                <div className="text-sm md:text-base text-gray-600 font-medium">
                  Showing times for: {location}
                </div>
              )}
              
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3 text-sm md:text-base">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-500 flex-shrink-0" />
                  <span className="font-semibold">Wake Up:</span>
                  <span className="ml-auto">{formatTime(schedule.wakeTime)}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm md:text-base">
                  <Sunrise className="h-4 w-4 md:h-5 md:w-5 text-orange-400 flex-shrink-0" />
                  <span className="font-semibold">Morning Walk:</span>
                  <span className="ml-auto">{formatTime(schedule.civilDawn)} - {formatTime(schedule.sunrise)}</span>
                </div>

                <div className="flex items-center gap-3 text-sm md:text-base">
                  <Sunset className="h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" />
                  <span className="font-semibold">Evening Walk:</span>
                  <span className="ml-auto">{formatTime(schedule.sunset)} - {formatTime(schedule.civilDusk)}</span>
                </div>

                <div className="flex items-center gap-3 text-sm md:text-base">
                  <Moon className="h-4 w-4 md:h-5 md:w-5 text-indigo-500 flex-shrink-0" />
                  <span className="font-semibold">Target Toddler Bedtime:</span>
                  <span className="ml-auto">{formatTime(schedule.toddlerBedTime)}</span>
                </div>

                <div className="flex items-center gap-3 text-sm md:text-base">
                  <Moon className="h-4 w-4 md:h-5 md:w-5 text-indigo-500 flex-shrink-0" />
                  <span className="font-semibold">Target Adult Bedtime:</span>
                  <span className="ml-auto">{formatTime(schedule.adultBedTime)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-xs md:text-sm text-gray-600">
                <p>* Times are calculated based on your location</p>
                <p>* Morning walk should begin during civil dawn for optimal light exposure</p>
                <p>* Evening walk should end around sunset to maintain proper circadian rhythm</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SunSchedule;
