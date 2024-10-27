import React, { useState, useEffect } from 'react';
import { Clock, Sun, Sunrise, Sunset, Moon, MapPin } from 'lucide-react';

type Schedule = {
  wakeTime: Date;
  civilDawn: Date;
  sunrise: Date;
  sunset: Date;
  civilDusk: Date;
  bedTime: Date;
};

type ZipResponse = {
  places?: Array<{
    latitude: string;
    longitude: string;
  }>;
};

type SunResponse = {
  status: string;
  results: {
    sunrise: string;
    sunset: string;
  };
};

// Inline Card Components
const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-lg ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="p-6 border-b border-gray-200">
    {children}
  </div>
);

const CardTitle: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <h2 className="text-xl font-semibold flex items-center">
    {children}
  </h2>
);

const CardContent: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="p-6">
    {children}
  </div>
);

// Inline Input Components
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
    className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

const Button: React.FC<{
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${className}`}
  >
    {children}
  </button>
);

const Alert: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}> = ({ children, variant = 'default' }) => (
  <div className={`p-4 rounded-md ${
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

  const fetchZipCodeLocation = async (zip: string): Promise<{ latitude: number; longitude: number }> => {
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      const data: ZipResponse = await response.json();
      
      if (!data.places || data.places.length === 0) {
        throw new Error('Invalid zip code');
      }
      
      return {
        latitude: parseFloat(data.places[0].latitude),
        longitude: parseFloat(data.places[0].longitude)
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
        const bedTime = new Date(sunsetTime.getTime() + 2.5 * 60 * 60000);

        setSchedule({
          wakeTime,
          civilDawn,
          sunrise: sunriseTime,
          sunset: sunsetTime,
          civilDusk,
          bedTime
        });
        setError(null);
      }
    } catch (err) {
      throw new Error('Failed to fetch sun data. Please try again.');
    }
  };

  const handleZipCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { latitude, longitude } = await fetchZipCodeLocation(zipCode);
      await fetchSunData(latitude, longitude);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getLocationAndSunData = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, (err) => {
            reject(new Error('Location access denied. Please enter your zip code.'));
          });
        });
        
        await fetchSunData(position.coords.latitude, position.coords.longitude);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setUseZipCode(true);
      } finally {
        setLoading(false);
      }
    };

    getLocationAndSunData();
  }, []);

  const formatTime = (date: Date | undefined): string => {
    return date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '';
  };

  if (loading && !useZipCode) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent>
          <div className="flex items-center justify-center">
            Loading sun data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          <Sun className="h-6 w-6 mr-2" />
          Daily Light Exposure Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {(error || useZipCode) && (
            <form onSubmit={handleZipCodeSubmit} className="space-y-4">
              <div className="flex gap-2">
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
                <Button type="submit" disabled={loading || zipCode.length !== 5}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Schedule
                </Button>
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
              <div className="flex items-center gap-4 text-lg">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Wake Up:</span>
                <span>{formatTime(schedule.wakeTime)}</span>
              </div>
              
              <div className="flex items-center gap-4 text-lg">
                <Sunrise className="h-5 w-5 text-orange-400" />
                <span className="font-semibold">Morning Walk:</span>
                <span>{formatTime(schedule.civilDawn)} - {formatTime(schedule.sunrise)}</span>
              </div>

              <div className="flex items-center gap-4 text-lg">
                <Sunset className="h-5 w-5 text-orange-500" />
                <span className="font-semibold">Evening Walk:</span>
                <span>{formatTime(schedule.sunset)} - {formatTime(schedule.civilDusk)}</span>
              </div>

              <div className="flex items-center gap-4 text-lg">
                <Moon className="h-5 w-5 text-indigo-500" />
                <span className="font-semibold">Target Bedtime:</span>
                <span>{formatTime(schedule.bedTime)}</span>
              </div>

              <div className="mt-6 text-sm text-gray-600">
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
