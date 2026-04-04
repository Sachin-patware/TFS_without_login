export interface FeedbackQuestion {
    key: string;
    label: string;
    shortLabel: string;
    category: string;
}

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
    {
        key: 'q1',
        label: 'Teaches explains topic with examples and applications',
        shortLabel: 'Topic Clarity',
        category: 'Lecture'
    },
    {
        key: 'q2',
        label: 'Motivates for experimenting new things using collaborative approach',
        shortLabel: 'Motivation',
        category: 'Lecture'
    },
    {
        key: 'q3',
        label: 'Encourages for questioning and clears doubt',
        shortLabel: 'Doubt Clearing',
        category: 'Lecture'
    },
    {
        key: 'q4',
        label: 'Available for consultation doubt clearing after class',
        shortLabel: 'Consultation',
        category: 'Lecture'
    },
    {
        key: 'q5',
        label: 'Properly explains the problem practical before conduction with real life examples',
        shortLabel: 'Practicals',
        category: 'Lecture'
    },
    {
        key: 'q6',
        label: 'Provides feedback on assignments and test evaluated',
        shortLabel: 'Assignment Feedback',
        category: 'Lecture'
    },
    {
        key: 'q7',
        label: 'Shares study material, lesson plan, reference material through LMS/other different sources',
        shortLabel: 'Study Material',
        category: 'Lecture'
    },
    {
        key: 'q8',
        label: 'Communicates effectively and ensures that every student has understood',
        shortLabel: 'Communication',
        category: 'Lecture'
    },
    {
        key: 'q9',
        label: 'I would like to learn other subjects from same teacher',
        shortLabel: 'Would Learn Again',
        category: 'Lecture'
    },
    {
        key: 'q10',
        label: 'I would recommend same teacher for teaching to my juniors',
        shortLabel: 'Recommendation',
        category: 'Lecture'
    },
];