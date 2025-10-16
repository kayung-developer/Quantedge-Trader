import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import api from 'services/api';
import toast from 'react-hot-toast';
import { STRATEGIES_CONFIG } from 'config/strategies.config';
import { PlayCircleIcon, BeakerIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// --- Result Display Components ---
const MetricCard = ({ title, value, unit = '' }) => (
    <div className="bg-light-bg dark:bg-dark-bg/50 p-4 rounded-lg text-center">
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-light-text dark:text-dark-text">{value}<span className="text-lg">{unit}</span></p>
    </div>
);

const BacktestResults = ({ results }) => {
    const isProfitable = results.total_return_pct > 0;
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-center">Backtest Results</h2>
            <div className={`p-6 rounded-xl text-center ${isProfitable ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                <p className="text-sm font-semibold uppercase">Total Return</p>
                <p className="text-5xl font-extrabold">{results.total_return_pct.toFixed(2)}%</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Sharpe Ratio" value={results.sharpe_ratio.toFixed(2)} />
                <MetricCard title="Win Rate" value={results.win_rate_pct.toFixed(2)} unit="%" />
                <MetricCard title="Max Drawdown" value={results.max_drawdown_pct.toFixed(2)} unit="%" />
                <MetricCard title="Total Trades" value={results.total_trades} />
            </div>
        </motion.div>
    );
};


const BacktestPage = () => {
    const { t } = useTranslation();
    const { register, handleSubmit, watch, control } = useForm();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const selectedStrategyName = watch('strategy_name', Object.keys(STRATEGIES_CONFIG)[0]);
    const selectedStrategyConfig = STRATEGIES_CONFIG[selectedStrategyName];

    const onRunBacktest = async (data) => {
        setLoading(true);
        setResults(null);
        const toastId = toast.loading("Starting backtest... This may take a minute.");

        const { strategy_name, symbol, timeframe, ...parameters } = data;
        const payload = { strategy_name, symbol, timeframe, parameters };

        try {
            const { data: response } = await api.post('/backtest', payload);
            toast.success(response.message, { id: toastId });
            // Here, a real system would poll for the result or wait for a WebSocket message.
            // For simplicity, we'll just show a message. The user can check the backend logs.
            // To make it complete, you'd add a GET /backtest/{result_id} endpoint and poll it.
        } catch (error) {
            toast.error(error.response?.data?.detail || "Backtest failed to start.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-6">{t('sidebar.backtest')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Configuration Panel --- */}
                <form onSubmit={handleSubmit(onRunBacktest)} className="lg:col-span-1 glass-card p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Configuration</h2>

                    <div>
                        <label className="block text-sm font-medium">Strategy</label>
                        <select {...register("strategy_name")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-dark-bg/50 dark:border-dark-border">
                            {Object.entries(STRATEGIES_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Symbol</label>
                            <input {...register("symbol", { required: true, value: "EURUSD" })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-dark-bg/50 dark:border-dark-border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Timeframe</label>
                            <select {...register("timeframe", { required: true, value: "H1" })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-dark-bg/50 dark:border-dark-border">
                                {['M15', 'M30', 'H1', 'H4', 'D1'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
                            </select>
                        </div>
                    </div>

                    <hr className="dark:border-dark-border/50"/>
                    <h3 className="font-semibold">Parameters</h3>
                    <div className="space-y-3">
                        {selectedStrategyConfig.parameters.map(param => (
                             <div key={param.name}>
                                <label className="block text-sm font-medium">{param.label}</label>
                                <input
                                    type={param.type}
                                    step={param.step || 'any'}
                                    defaultValue={param.defaultValue}
                                    {...register(`parameters.${param.name}`, { valueAsNumber: param.type === 'number' })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-dark-bg/50 dark:border-dark-border"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100"
                    >
                        <PlayCircleIcon className="h-6 w-6 mr-2"/>
                        {loading ? "Running Backtest..." : "Run Backtest"}
                    </button>
                </form>

                {/* --- Results Panel --- */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-xl p-6 border dark:border-dark-border">
                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">Simulating historical performance...</p>
                            </motion.div>
                        )}
                        {results && (
                             <motion.div key="results">
                                <BacktestResults results={results} />
                             </motion.div>
                        )}
                        {!loading && !results && (
                             <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center h-full text-center">
                                <div>
                                    <BeakerIcon className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600"/>
                                    <h3 className="mt-2 text-lg font-medium">Ready to Test</h3>
                                    <p className="mt-1 text-sm text-gray-500">Configure a strategy and run a backtest to see its historical performance.</p>
                                </div>
                             </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default BacktestPage;