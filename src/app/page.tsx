"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  FiActivity, 
  FiUsers, 
  FiCalendar, 
  FiTrendingUp,
  FiCheck,
  FiArrowRight,
  FiPlay,
  FiAward,
  FiShield,
  FiZap
} from "react-icons/fi";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <FiUsers className="w-8 h-8" />,
      title: "Üye Yönetimi",
      description: "Tüm üyelerinizi tek bir yerden kolayca yönetin",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <FiCalendar className="w-8 h-8" />,
      title: "Antrenman Takibi",
      description: "Antrenman programlarını planlayın ve takip edin",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <FiActivity className="w-8 h-8" />,
      title: "Performans Analizi",
      description: "Sporcularınızın gelişimini detaylı raporlarla izleyin",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <FiTrendingUp className="w-8 h-8" />,
      title: "Finansal Yönetim",
      description: "Aidatları ve ödemeleri otomatik takip edin",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const stats = [
    { label: "Aktif Kulüp", value: "500+", icon: <FiAward /> },
    { label: "Mutlu Sporcu", value: "50K+", icon: <FiUsers /> },
    { label: "Güvenli İşlem", value: "1M+", icon: <FiShield /> },
    { label: "Hızlı Destek", value: "7/24", icon: <FiZap /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FiActivity className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">SportClub Pro</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="#features" className="hover:text-blue-400 transition-colors">Özellikler</Link>
            <Link href="#pricing" className="hover:text-blue-400 transition-colors">Fiyatlar</Link>
            <Link href="#contact" className="hover:text-blue-400 transition-colors">İletişim</Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2 rounded-full font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className={`max-w-7xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm">Yeni: AI destekli performans analizi</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Spor Klübünüzü
            <br />
            Geleceğe Taşıyın
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Modern teknoloji ile spor klübünüzü yönetin. Üyeler, antrenmanlar ve finansal işlemler tek platformda.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="/login"
              className="group bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-full font-medium text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
            >
              <span>Giriş Yap</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="group bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full font-medium text-lg hover:bg-white/20 transition-all duration-300 flex items-center space-x-2">
              <FiPlay />
              <span>Demo İzle</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
              >
                <div className="text-3xl mb-2 text-blue-400">{stat.icon}</div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Güçlü Özellikler
            </h2>
            <p className="text-xl text-gray-400">
              İhtiyacınız olan her şey tek platformda
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`group cursor-pointer bg-white/5 backdrop-blur-sm rounded-2xl p-6 transition-all duration-300 ${
                    activeFeature === index ? 'bg-white/10 scale-105' : 'hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${feature.color} bg-opacity-20`}>
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-gray-400">{feature.description}</p>
                    </div>
                    {activeFeature === index && (
                      <FiCheck className="w-6 h-6 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="relative h-96 md:h-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-center p-8 transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <div className={`p-6 rounded-2xl bg-gradient-to-r ${features[activeFeature].color} bg-opacity-20 mb-4 inline-block`}>
                    {features[activeFeature].icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{features[activeFeature].title}</h3>
                  <p className="text-gray-300">{features[activeFeature].description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-4">
              Hazır mısınız?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              14 gün ücretsiz deneme sürümüyle başlayın. Kredi kartı gerekmez.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 bg-white text-gray-900 px-8 py-4 rounded-full font-medium text-lg hover:shadow-lg hover:shadow-white/25 transition-all duration-300 transform hover:scale-105"
            >
              <span>Giriş Yap</span>
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}