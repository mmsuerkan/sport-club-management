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
  FiZap,
  FiSmartphone,
  FiBarChart,
  FiClock,
  FiDollarSign,
  FiStar,
  FiHeart
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
      <section className="relative z-10 px-6 py-12 md:py-20 min-h-[calc(100vh-80px)] flex items-center">
        <div className={`max-w-7xl mx-auto w-full transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">Yeni: AI destekli performans analizi</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Spor Klübünüzü
                </span>
                <br />
                <span className="text-white">Geleceğe Taşıyın</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                Modern teknoloji ile spor klübünüzü yönetin. Üyeler, antrenmanlar ve finansal işlemler tek platformda.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
                <Link
                  href="/login"
                  className="group bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-full font-medium text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                >
                  <span>Hemen Başla</span>
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="group bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full font-medium text-lg hover:bg-white/20 transition-all duration-300 flex items-center space-x-2">
                  <FiPlay />
                  <span>Demo İzle</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <FiCheck className="text-green-400" />
                  <span>14 Gün Ücretsiz Deneme</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiCheck className="text-green-400" />
                  <span>Kredi Kartı Gerekmez</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiCheck className="text-green-400" />
                  <span>İptal Garantisi</span>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="relative z-10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${feature.color} bg-opacity-20 inline-block mb-3`}>
                        {feature.icon}
                      </div>
                      <h3 className="font-semibold mb-1 text-sm">{feature.title}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-20 blur-xl"></div>
            </div>
          </div>

          {/* Stats - Now part of hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-16 lg:mt-20">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 hover:from-white/10 hover:to-white/15 transition-all duration-300 transform hover:scale-105 border border-white/10"
              >
                <div className="text-2xl md:text-3xl mb-2 text-blue-400">{stat.icon}</div>
                <div className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-xs md:text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 px-6 py-20 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Neden SportClub Pro?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Spor klübünüzü dijitalleştirin, verimliliği artırın
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6">
                  <FiSmartphone className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Mobil Uyumlu</h3>
                <p className="text-gray-400 mb-4">
                  Her yerden erişim sağlayın. Telefon, tablet veya bilgisayardan klübünüzü yönetin.
                </p>
                <div className="flex items-center text-sm text-blue-400">
                  <span>iOS & Android uygulamaları</span>
                  <FiArrowRight className="ml-2" />
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                  <FiBarChart className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Detaylı Raporlama</h3>
                <p className="text-gray-400 mb-4">
                  Gelir-gider analizleri, üye istatistikleri ve performans raporları ile büyümeyi takip edin.
                </p>
                <div className="flex items-center text-sm text-purple-400">
                  <span>Gerçek zamanlı veriler</span>
                  <FiArrowRight className="ml-2" />
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6">
                  <FiClock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Zaman Tasarrufu</h3>
                <p className="text-gray-400 mb-4">
                  Otomatik hatırlatmalar, toplu mesajlaşma ve hızlı işlemlerle zamandan tasarruf edin.
                </p>
                <div className="flex items-center text-sm text-green-400">
                  <span>%80 daha hızlı işlemler</span>
                  <FiArrowRight className="ml-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Kullanıcılarımız Ne Diyor?
            </h2>
            <p className="text-lg text-gray-400">
              Binlerce spor klübü SportClub Pro'yu tercih ediyor
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center mb-4">
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
              </div>
              <p className="text-gray-300 mb-4">
                "SportClub Pro sayesinde üye takibi ve aidat yönetimi çok kolaylaştı. Artık sporculara daha fazla zaman ayırabiliyorum."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-semibold">Ahmet Yılmaz</p>
                  <p className="text-sm text-gray-400">Basketbol Antrenörü</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center mb-4">
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
              </div>
              <p className="text-gray-300 mb-4">
                "Finansal raporlama özellikleri harika. Gelir-gider takibi yapmak hiç bu kadar kolay olmamıştı."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-semibold">Zeynep Kaya</p>
                  <p className="text-sm text-gray-400">Fitness Salonu Sahibi</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center mb-4">
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
                <FiStar className="text-yellow-400 fill-current" />
              </div>
              <p className="text-gray-300 mb-4">
                "Mobil uygulama sayesinde sahada bile üye kaydı yapabiliyorum. Müthiş bir kolaylık!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-semibold">Mehmet Demir</p>
                  <p className="text-sm text-gray-400">Futbol Okulu Müdürü</p>
                </div>
              </div>
            </div>
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