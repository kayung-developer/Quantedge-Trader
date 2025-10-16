import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from 'services/api';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

import Skeleton from 'components/core/Skeleton';
import StrategyCard from 'components/strategies/StrategyCard';
import StrategyModal from 'components/strategies/StrategyModal';
import ConfirmDeleteModal from 'components/strategies/ConfirmDeleteModal';
import Joyride, { STATUS } from 'react-joyride';

const StrategiesPage = () => {
  const { t } = useTranslation();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState(null); // For editing
  const [strategyToDelete, setStrategyToDelete] = useState(null);
  const [runTour, setRunTour] = useState(false);

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/strategies');
      setStrategies(data);
       if (data.length === 0 && !localStorage.getItem('strategy_tour_completed')) {
        setRunTour(true);
      }
    } catch (error) {
      toast.error('Failed to fetch strategies.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);


   const tourSteps = [
    {
      target: '#add-strategy-btn',
      content: t('tour.strategies.step1'),
      disableBeacon: true,
    },
    {
      target: '#strategy-modal-form',
      content: t('tour.strategies.step2'),
    },
    {
      target: '#strategy-card-toggle',
      content: t('tour.strategies.step3'),
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, type } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
        setRunTour(false);
        localStorage.setItem('strategy_tour_completed', 'true');
    }
    // If the tour is on the modal step and the modal closes, advance the tour
    if (type === 'step:after' && data.index === 1 && !isModalOpen) {
       // This is a bit tricky, might need a ref to the joyride instance to advance it.
       // For simplicity, we'll let the user continue manually.
    }
  };

  const handleOpenModal = (strategy = null) => {
    setCurrentStrategy(strategy);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStrategy(null);
  };

  const handleOpenDeleteModal = (strategy) => {
    setStrategyToDelete(strategy);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setStrategyToDelete(null);
  };

  const handleFormSubmit = async (payload) => {
    const promise = currentStrategy
      ? api.put(`/strategies/${currentStrategy.id}`, payload)
      : api.post('/strategies', payload);

    toast.promise(promise, {
      loading: currentStrategy ? 'Updating strategy...' : 'Creating strategy...',
      success: (res) => {
        fetchStrategies(); // Refresh list
        handleCloseModal();
        return `Strategy successfully ${currentStrategy ? 'updated' : 'created'}!`;
      },
      error: (err) => {
        return err.response?.data?.detail || 'An error occurred.';
      },
    });
  };

  const handleToggleStatus = async (strategy, newStatus) => {
    const status = newStatus ? 'active' : 'inactive';
    try {
      await api.patch(`/strategies/${strategy.id}/status?status=${status}`);
      setStrategies(prev => prev.map(s => s.id === strategy.id ? { ...s, status } : s));
      toast.success(`Strategy set to ${status}.`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!strategyToDelete) return;
    try {
        await api.delete(`/strategies/${strategyToDelete.id}`);
        setStrategies(prev => prev.filter(s => s.id !== strategyToDelete.id));
        toast.success('Strategy deleted successfully.');
    } catch (error) {
        toast.error('Failed to delete strategy.');
    } finally {
        handleCloseDeleteModal();
    }
  };


  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      );
    }
    if (strategies.length === 0) {
      return (
        <div className="text-center py-16 bg-white dark:bg-dark-card rounded-xl border border-dashed dark:border-dark-border">
          <h3 className="text-xl font-semibold">{t('strategies.placeholder')}</h3>
          <p className="text-gray-500 mt-2">Click the button below to configure your first automated strategy.</p>
          <button onClick={() => handleOpenModal()} className="mt-4 px-4 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-colors">
            {t('strategies.add')}
          </button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {strategies.map(strategy => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onToggleStatus={handleToggleStatus}
              onEdit={handleOpenModal}
              onDelete={handleOpenDeleteModal}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('strategies.title')}</h1>
        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-colors">
          {t('strategies.add')}
        </button>
      </div>

      {renderContent()}

      <div id="strategy-modal-form">
        <StrategyModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSubmit={handleFormSubmit}
            strategy={currentStrategy}
        />
      </div>

      <StrategyModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        strategy={currentStrategy}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        strategy={strategyToDelete}
      />
    </div>
  );
};

export default StrategiesPage;