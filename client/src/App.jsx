import React, { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, Download, BrainCircuit, Link2, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";

function App() {
  const [inputType, setInputType] = useState('url'); // 'url' or 'text'
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sending both the type and the content to the backend
      const res = await axios.post('http://localhost:5000/api/scan', { inputType, content });
      setData(res.data);
    } catch (err) {
      alert("Error scanning content. Check terminal for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.text("QuickScan AI Report", 10, 10);
    doc.text(`Source: ${data.sourceUrl}`, 10, 20);
    doc.text("Summary:", 10, 30);
    
    // Auto-wrap text so it doesn't run off the PDF page
    const splitSummary = doc.splitTextToSize(data.summary, 180);
    doc.text(splitSummary, 10, 40);
    
    doc.save("QuickScan_Report.pdf");
  };

  return (
    <div className="min-h-screen p-6 lg:p-12 font-sans">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-blue-500" size={32} />
          <h1 className="text-2xl font-bold tracking-tight">QuickScan AI</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Input Section */}
        <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl mb-8 shadow-xl">
          
          {/* Toggle Buttons */}
          <div className="flex gap-4 mb-6">
            <button 
              type="button"
              onClick={() => { setInputType('url'); setContent(''); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-colors ${inputType === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Link2 size={18} /> URL
            </button>
            <button 
              type="button"
              onClick={() => { setInputType('text'); setContent(''); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-colors ${inputType === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <FileText size={18} /> Raw Text
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleScan} className="flex flex-col md:flex-row gap-4">
            {inputType === 'url' ? (
              <input 
                type="url" 
                placeholder="Paste link here (e.g., https://en.wikipedia.org/wiki/Artificial_intelligence)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            ) : (
              <textarea 
                placeholder="Paste your long text document here..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            )}
            
            <button 
              disabled={loading || !content}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-50 h-fit md:h-auto"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
              {loading ? "Analyzing..." : "Scan"}
            </button>
          </form>
        </section>

        {/* Results Bento Grid */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h2 className="text-blue-400 font-bold mb-4 uppercase text-xs tracking-widest">Summary</h2>
              <p className="text-xl leading-relaxed text-slate-300">{data.summary}</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col justify-center items-center text-center">
              <h2 className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-widest">Sentiment</h2>
              <span className="text-6xl font-black text-white">{data.sentimentScore}%</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h2 className="text-blue-400 font-bold mb-4 uppercase text-xs tracking-widest">Key Points</h2>
              <ul className="space-y-3">
                {data.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-3 text-slate-400">
                    <span className="text-blue-500 mt-1">•</span> <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h2 className="text-blue-400 font-bold mb-4 uppercase text-xs tracking-widest">Entities</h2>
              <div className="flex flex-wrap gap-2">
                {data.entities.map((e, i) => (
                  <span key={i} className="bg-slate-950 border border-slate-700 px-3 py-1 rounded-full text-sm text-slate-300">{e}</span>
                ))}
              </div>
            </div>

            <button 
              onClick={downloadPDF}
              className="col-span-1 md:col-span-3 bg-slate-800 hover:bg-slate-700 p-6 rounded-3xl flex items-center justify-center gap-3 transition-colors text-white font-bold"
            >
              <Download /> Export PDF
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;