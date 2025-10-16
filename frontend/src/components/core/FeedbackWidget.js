import React, { useState, Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import api from 'services/api';
import toast from 'react-hot-toast';

const FeedbackWidget = () => {
    const { register, handleSubmit, reset } = useForm();
    const [isOpen, setIsOpen] = useState(false);

    const onSubmit = async (data) => {
        const promise = api.post('/system/feedback', {
            ...data,
            page: window.location.pathname
        });

        toast.promise(promise, {
            loading: 'Submitting feedback...',
            success: () => {
                reset();
                setIsOpen(false);
                return 'Thank you for your feedback!';
            },
            error: 'Failed to submit feedback.',
        });
    };

    return (
        <div className="fixed bottom-5 right-5 z-20">
            <Popover className="relative">
                {({ open }) => {
                    setIsOpen(open); // Sync state for programmatic closing
                    return (
                        <>
                            <Popover.Button className="px-4 py-2 bg-primary text-white font-semibold rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                Feedback
                            </Popover.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-200"
                                enterFrom="opacity-0 translate-y-1"
                                enterTo="opacity-100 translate-y-0"
                                leave="transition ease-in duration-150"
                                leaveFrom="opacity-100 translate-y-0"
                                leaveTo="opacity-0 translate-y-1"
                            >
                                <Popover.Panel className="absolute bottom-full right-0 w-80 mb-2 transform">
                                    <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                                        <div className="relative bg-white dark:bg-dark-card p-4">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Submit Feedback</h3>
                                            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                                                <select {...register("feedback_type")} className="w-full rounded-md border-gray-300 dark:bg-gray-800 dark:border-dark-border">
                                                    <option value="suggestion">Suggestion</option>
                                                    <option value="bug">Bug Report</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <textarea
                                                    {...register("message", { required: true, minLength: 10 })}
                                                    rows="5"
                                                    placeholder="Tell us what you think..."
                                                    className="w-full rounded-md border-gray-300 dark:bg-gray-800 dark:border-dark-border"
                                                ></textarea>
                                                <button type="submit" className="w-full py-2 bg-secondary text-white font-semibold rounded-md hover:bg-green-600">
                                                    Send
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </Popover.Panel>
                            </Transition>
                        </>
                    );
                }}
            </Popover>
        </div>
    );
};

export default FeedbackWidget;