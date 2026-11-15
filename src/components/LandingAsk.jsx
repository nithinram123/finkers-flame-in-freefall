import { ArrowRight, Database, MessageCircle } from 'lucide-react';
import { evidenceQuestions } from '../lib/evidence-questions.mjs';
import { analystUrl } from '../lib/routes.mjs';

export default function LandingAsk() {
  return (
    <section className="landing-ask" id="ask-the-evidence" aria-labelledby="landing-ask-title">
      <div className="landing-ask-art" aria-hidden="true">
        <div className="landing-ask-pixels" />
      </div>
      <div className="landing-ask-inner">
        <div className="landing-ask-copy" data-reveal>
          <h2 id="landing-ask-title">Ask the evidence.</h2>
          <p>
            Explore questions about cabin air, fuels or test outcomes. Open the original NASA
            records behind the answer.
          </p>
        </div>
        <div className="landing-ask-console" data-reveal>
          <div className="landing-ask-console-head">
            <MessageCircle size={17} aria-hidden="true" />
            <label htmlFor="landing-question">Your question</label>
          </div>
          <form className="landing-question" action="/analyst" method="get">
            <textarea
              id="landing-question"
              name="question"
              placeholder={evidenceQuestions[0]}
              required
              maxLength={500}
              rows={3}
            />
            <div className="landing-question-actions">
              <span>
                <Database size={15} aria-hidden="true" /> NASA PSI
              </span>
              <button className="primary" type="submit">
                Open Ask <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
          <div className="landing-ask-examples" aria-label="Example questions">
            <a href={analystUrl(evidenceQuestions[0])}>Methanol extinction</a>
            <a href={analystUrl(evidenceQuestions[1])}>Moon Base tests</a>
          </div>
        </div>
      </div>
    </section>
  );
}
