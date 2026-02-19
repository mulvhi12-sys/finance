import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, TrendingUp, AlertCircle, CheckCircle, XCircle, BarChart3, Download, Send, MessageSquare, Sparkles, Crown, Zap, Mail, FileSpreadsheet, Calendar, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FinancialAnalyzer() {
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length !== selectedFiles.length) {
      setError('Only PDF files are accepted');
      return;
    }
    
    setFiles(pdfFiles);
    setError('');
    setReports([]);
    setChatMessages([]);
  };

  const analyzeFinancials = async () => {
    if (files.length === 0) return;
    
    setAnalyzing(true);
    setError('');
    const newReports = [];

    try {
      for (const file of files) {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64Data
                  }
                },
                {
                  type: 'text',
                  text: `You are a financial analyst. Analyze these financial accounts and provide a comprehensive report in JSON format ONLY. Do not include any preamble, explanation, or markdown formatting - return ONLY valid JSON.

The JSON should have this exact structure:
{
  "companyName": "string",
  "periodCovered": "string",
  "currentPeriod": "e.g., FY 2023 or Q3 2024",
  "previousPeriod": "e.g., FY 2022 or Q3 2023",
  "industry": "string (if identifiable)",
  "executiveSummary": "2-3 sentence overview",
  "onePageSummary": "Single paragraph capturing the essence of financial health, key highlights, and critical concerns",
  "creditRecommendation": {
    "decision": "APPROVE|DECLINE|CONDITIONAL",
    "confidence": "HIGH|MEDIUM|LOW",
    "reasoning": "brief explanation"
  },
  "keyMetrics": {
    "revenue": {"current": number, "previous": number, "change": "percentage string"},
    "netIncome": {"current": number, "previous": number, "change": "percentage string"},
    "totalAssets": {"current": number, "previous": number, "change": "percentage string"},
    "totalLiabilities": {"current": number, "previous": number, "change": "percentage string"},
    "equity": {"current": number, "previous": number, "change": "percentage string"},
    "cashFlow": {"current": number, "previous": number, "change": "percentage string"}
  },
  "ratios": {
    "currentRatio": number,
    "quickRatio": number,
    "debtToEquity": number,
    "returnOnAssets": number,
    "returnOnEquity": number,
    "profitMargin": number,
    "industryBenchmark": "comparison if possible"
  },
  "strengths": ["array of 3-5 key strengths"],
  "concerns": ["array of 3-5 key concerns or risks"],
  "trends": ["array of 3-4 notable trends across periods"]
}

If data for previous periods is not available, use null for previous values and changes. Extract all financial data in the company's reported currency. Be precise with numbers and clearly identify time periods.`
                }
              ]
            }],
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const textContent = data.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid response format from API');
        }

        const report = JSON.parse(jsonMatch[0]);
        newReports.push({
          fileName: file.name,
          ...report
        });
      }

      setReports(newReports);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatRatio = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  const downloadPDF = (report) => {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Financial Analysis - ${report.companyName}</title></head><body><h1>Financial Analysis Report</h1><h2>${report.companyName}</h2><p><strong>Period:</strong> ${report.periodCovered}</p><h2>Executive Summary</h2><p>${report.onePageSummary || report.executiveSummary}</p><h2>Credit Decision: ${report.creditRecommendation.decision}</h2><p>${report.creditRecommendation.reasoning}</p></body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.companyName.replace(/[^a-z0-9]/gi, '_')}_Analysis.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (report) => {
    const csvContent = `Financial Analysis Report - ${report.companyName}\nGenerated: ${new Date().toLocaleDateString()}\n\nKEY METRICS\nMetric,Current,Previous,Change\nRevenue,${report.keyMetrics.revenue?.current || 0},${report.keyMetrics.revenue?.previous || 0},${report.keyMetrics.revenue?.change || 'N/A'}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.companyName.replace(/[^a-z0-9]/gi, '_')}_Analysis.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendEmailReport = (report) => {
    const subject = encodeURIComponent(`Financial Analysis: ${report.companyName}`);
    const body = encodeURIComponent(`Financial Analysis Report for ${report.companyName}\n\nExecutive Summary:\n${report.onePageSummary || report.executiveSummary}\n\nCredit Decision: ${report.creditRecommendation.decision}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || reports.length === 0 || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const contextData = reports.map(r => ({
        company: r.companyName,
        summary: r.executiveSummary,
        credit: r.creditRecommendation,
        metrics: r.keyMetrics,
      }));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `You are a financial analyst assistant. Here is the analysis data: ${JSON.stringify(contextData)}\n\nUser question: ${userMessage}\n\nProvide a helpful response.`
            }
          ],
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getCreditIcon = (decision) => {
    switch(decision) {
      case 'APPROVE': return <CheckCircle className="w-6 h-6 text-emerald-400" />;
      case 'DECLINE': return <XCircle className="w-6 h-6 text-rose-400" />;
      default: return <AlertCircle className="w-6 h-6 text-amber-400" />;
    }
  };

  const getCreditColor = (decision) => {
    switch(decision) {
      case 'APPROVE': return 'from-emerald-900/40 to-green-900/40 border-emerald-500/50';
      case 'DECLINE': return 'from-rose-900/40 to-red-900/40 border-rose-500/50';
      default: return 'from-amber-900/40 to-yellow-900/40 border-amber-500/50';
    }
  };

  const prepareChartData = (report) => {
    if (!report.keyMetrics) return [];
    return [
      {
        period: report.previousPeriod || 'Previous',
        Revenue: report.keyMetrics.revenue?.previous || 0,
        'Net Income': report.keyMetrics.netIncome?.previous || 0,
      },
      {
        period: report.currentPeriod || 'Current',
        Revenue: report.keyMetrics.revenue?.current || 0,
        'Net Income': report.keyMetrics.netIncome?.current || 0,
      }
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full border-2 border-amber-500/30 p-8 relative">
            <button onClick={() => setShowPremiumModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl">×</button>
            <div className="flex items-center gap-3 mb-6">
              <Crown className="w-10 h-10 text-amber-400" />
              <h2 className="text-3xl font-bold text-white">Upgrade to Premium</h2>
            </div>
            <div className="text-5xl font-bold text-white mb-2 text-center">€15<span className="text-2xl text-slate-400">/month</span></div>
            <p className="text-slate-300 mb-6 text-center">Billed monthly • Cancel anytime</p>
            <button onClick={() => { alert('Demo Mode Active!'); setShowPremiumModal(false); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl">
              Subscribe Now
            </button>
          </div>
        </div>
      )}

      <div className="relative bg-slate-800 shadow-2xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Financial Analyzer</h1>
                <p className="text-slate-400 text-sm">{isPremium && <span className="flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" />Premium Mode Active</span>}</p>
              </div>
            </div>
            <button onClick={() => setShowPremiumModal(true)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl">
              <Crown className="w-5 h-5" />
              <span className="hidden sm:inline">{isPremium ? 'Premium Active' : 'Upgrade'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-slate-800/50 rounded-3xl shadow-2xl p-8 mb-8 border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Upload Documents</h2>
          </div>

          <div className="border-2 border-dashed border-slate-600 rounded-2xl p-12 text-center hover:border-blue-500 transition-all">
            <input type="file" id="fileUpload" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
            <label htmlFor="fileUpload" className="cursor-pointer">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl inline-block mb-4">
                <FileText className="w-12 h-12 text-white" />
              </div>
              <p className="text-slate-200 font-semibold text-lg mb-2">Drop files here or click to upload</p>
              <p className="text-sm text-slate-400">PDF financial statements</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-700/50 p-4 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span className="flex-1 text-slate-200">{file.name}</span>
                  <span className="text-slate-400 text-sm">{(file.size / 1024).toFixed(0)} KB</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-rose-900/30 border-2 border-rose-500/50 rounded-xl text-rose-300">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              {error}
            </div>
          )}

          <button onClick={analyzeFinancials} disabled={files.length === 0 || analyzing} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3">
            {analyzing ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-6 h-6" />
                <span>Analyze Financial Accounts</span>
              </>
            )}
          </button>
        </div>

        {reports.map((report, idx) => (
          <div key={idx} className="bg-slate-800/50 rounded-3xl shadow-2xl p-8 mb-8 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-blue-400">{report.companyName}</h2>
              <div className="flex gap-2">
                <button onClick={() => downloadPDF(report)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  PDF
                </button>
                {isPremium && (
                  <>
                    <button onClick={() => exportToExcel(report)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      Excel
                    </button>
                    <button onClick={() => sendEmailReport(report)} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mb-8 p-8 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl border-2 border-blue-500/30">
              <h3 className="text-2xl font-bold text-white mb-4">📋 Executive Summary</h3>
              <p className="text-slate-200 leading-relaxed text-lg">{report.onePageSummary || report.executiveSummary}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">📊 Key Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/30 p-6 rounded-2xl text-center">
                  <div className="text-sm text-slate-400">Revenue</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(report.keyMetrics.revenue?.current)}</div>
                  <div className="text-sm text-emerald-400">{report.keyMetrics.revenue?.change}</div>
                </div>
                <div className="bg-slate-700/30 p-6 rounded-2xl text-center">
                  <div className="text-sm text-slate-400">Net Income</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(report.keyMetrics.netIncome?.current)}</div>
                  <div className="text-sm text-emerald-400">{report.keyMetrics.netIncome?.change}</div>
                </div>
                <div className="bg-slate-700/30 p-6 rounded-2xl text-center">
                  <div className="text-sm text-slate-400">Profit Margin</div>
                  <div className="text-2xl font-bold text-white">{formatRatio(report.ratios.profitMargin)}%</div>
                </div>
                <div className="bg-slate-700/30 p-6 rounded-2xl text-center">
                  <div className="text-sm text-slate-400">Total Assets</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(report.keyMetrics.totalAssets?.current)}</div>
                  <div className="text-sm text-emerald-400">{report.keyMetrics.totalAssets?.change}</div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Historical Trends</h3>
              <div className="bg-slate-700/30 p-6 rounded-2xl">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareChartData(report)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="period" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={3} />
                    <Line type="monotone" dataKey="Net Income" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`bg-gradient-to-br ${getCreditColor(report.creditRecommendation.decision)} border-2 rounded-2xl p-6 mb-8`}>
              <div className="flex items-start gap-4">
                {getCreditIcon(report.creditRecommendation.decision)}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">Credit Decision: {report.creditRecommendation.decision}</h3>
                  <p className="text-slate-200">{report.creditRecommendation.reasoning}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-emerald-900/20 p-6 rounded-2xl border-2 border-emerald-500/30">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  Key Strengths
                </h3>
                <ul className="space-y-3">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="flex gap-3 text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-amber-900/20 p-6 rounded-2xl border-2 border-amber-500/30">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                  Areas of Concern
                </h3>
                <ul className="space-y-3">
                  {report.concerns.map((c, i) => (
                    <li key={i} className="flex gap-3 text-slate-300">
                      <span className="text-amber-400">⚠</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {reports.length > 0 && (
          <div className="bg-slate-800/50 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <MessageSquare className="w-6 h-6" />
                Ask Questions About Your Analysis
              </h3>
            </div>
            
            <div className="h-96 overflow-y-auto p-6 space-y-4 bg-slate-900/50">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-slate-300 text-lg">Start a conversation about the financial analysis</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl px-6 py-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 px-6 py-4 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-6 bg-slate-800/50 border-t-2 border-slate-700">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about the financial analysis..."
                  className="flex-1 px-6 py-4 bg-slate-700/50 border-2 border-slate-600 rounded-2xl focus:outline-none focus:border-purple-500 text-slate-200 placeholder-slate-500"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold rounded-2xl flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
