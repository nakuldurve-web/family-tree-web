import SubmissionForm from '@/components/SubmissionForm';

export const metadata = {
  title: 'Add to the Family Tree',
};

export default function SubmitPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-tan-800 mb-2">
          Add to the Family Tree
        </h1>
        <p className="text-tan-600">
          Submit new family members, links, or corrections. All submissions are
          reviewed by an admin before appearing on the tree.
        </p>
      </div>

      <SubmissionForm />
    </div>
  );
}
