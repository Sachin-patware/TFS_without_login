export interface FeedbackQuestion {
    key: string;
    label: string;
    category: string;
}

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
    {
        key: 'q1',
        label: 'Teaches explains topic with examples and applications',
        category: 'Lecture'
    },
    {
        key: 'q2',
        label: 'Motivates for experimenting new things using collaborative approach',
        category: 'Lecture'
    },
    {
        key: 'q3',
        label: 'Encourages for questioning and clears doubt',
        category: 'Lecture'
    },
    {
        key: 'q4',
        label: 'Available for consultation doubt clearing after class',
        category: 'Lecture'
    },
    {
        key: 'q5',
        label: 'Properly explains the problem practical before conduction',
        category: 'Lecture'
    },
    {
        key: 'q6',
        label: 'Provides feedback on assignments and test evaluated',
        category: 'Lecture'
    },
    {
        key: 'q7',
        label: 'Shares study material, lesson plan, reference material through LMS',
        category: 'Lecture'
    },
    {
        key: 'q8',
        label: 'Communicates effectively and ensures that every student has understood',
        category: 'Lecture'
    },
    {
        key: 'q9',
        label: 'I would like to learn other subjects from same teacher',
        category: 'Lecture'
    },
    {
        key: 'q10',
        label: 'I would recommend same teacher for teaching to my juniors',
        category: 'Lecture'
    },
];