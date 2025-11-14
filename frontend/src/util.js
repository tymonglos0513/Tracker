export const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
export const PDF_API = import.meta.env.VITE_PDF_API_URL || "http://localhost:9000/resume/pdf";
let authKey = localStorage.getItem("authKey") || ""

export function setAuthKeyUtil(newKey) {
  authKey = newKey || "";
  
  if (authKey) {
    localStorage.setItem("authKey", authKey);
  } else {
    localStorage.removeItem("authKey");
  }
}

/**
 * Fetch resume JSON from backend, send to PDF API, download file.
 */
export async function downloadResume(resumeId, filename = "resume.pdf") {
  if (!resumeId) return alert("Missing resume ID.");

  try {
    // 1. Get resume JSON
    const resResume = await apiFetch(`${BACKEND}/api/resumes/${resumeId}`);
    if (!resResume.ok) throw new Error(await resResume.text());
    const { resume } = await resResume;

    // 2. Send to external PDF API
    const resPdf = await apiFetch(PDF_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/pdf" },
      body: JSON.stringify(resume)
    });
    if (!resPdf.ok) throw new Error(await resPdf.text());

    // 3. Download file
    const blob = await resPdf.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Download failed: " + err.message);
  }
}

export async function apiFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Auth-Key": authKey,
    "X-Frontend-Source": window.location.href,
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  
  const contentType = res.headers.get("content-type") || "";

  // If it's JSON → parse and return it
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch (e) {
      console.warn("apiFetch: JSON parse failed, returning raw Response", e);
      return res; // fallback to raw Response
    }
  }

  // Otherwise return the raw Response object (for PDFs, images, etc.)
  return res;
}

export function truncateText(text, max = 30) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export const promptText = `
I need to have a call with company. When I give you interview's question, you should give me my professional answer based on resume.
When I give you a question, plz give me gimme in a speaking english, and then give me key points. You should put some words like "you know", "well" or etc to simulate real person's speaking.

When I describe about myself in previous roles, I should focus on explaning how I worked with skills from job description first, and then describe other skills as well.
Flexibly align my professional experience well fit for job description. If job description requires Python, describe most of my work in my experience were in Python. If it is Go, please describe like Go. Double check if you give me conversational words.

When I need to describe about my past project, you should give me very details of project likely project name, tech stack for backend, frontend and cloud, and project impact, client satisfy and etc. Give me in professional, but super easy english words. Don't put any short form like "I'd". If there's a simplified word, like IT -> give me expanded words as well in () -> IT(Information Technology)

If question is not a general question, like explaining about my experience or project I have built, and it requires some specific answer, plz give me key points of answer in one paragraph so that the interviewer could know that I'm very experienced with that by one sentences. After that, we can describe in details about key answer.
If question is a technical question, give a short, strong key answer for that first, and then describe in details.

And for technical questions, when you answer, don't put any code like ConfigType.BOOL.value, but please give me as a readable code, like value property of BOOL which is property of ConfigType object.

Avoid using “we” statements

FYI, my contract has finished before 2 weeks, and I'm actively looking for a new job opportunity, so that I can join any company immediately.
Don't put following words - though

For all inputs, it is more likely a block of text, so check with previous input, and don't answer for repeated questions.
For example, in previous input, they asked "tell me about your experience", and in next input, they ask "tell me about your experience. What is your skill set?" -> In this case, don't repeat answer for "tell me about your experience". But sometimes, they want to ask specific area of question from above one, then you should answer.

When you describe about project, plz dont mention about "scalable" or "reliable" - It's too common answer.

For system design questions, don't just collect requirements from question, but find out possible use cases yourself.

For questions like what you're looking for in your next role, don't too focus on things in JD. Please focus on general ones, not JD-specific things.

Here are some interview tips.
-----------------------------------------------------------------------------------------
Great Answers to Tough Interview Questions


Whether you are looking for your first job, or you are a seasoned executive taking another step up the career ladder, there are certain universal interview techniques that you should have in mind to make sure you give the best interview you can.

This brief guide highlights some of the tough questions you might be faced with, and suggests strategies to answer them as persuasively as possible.  Always bear in mind that every interviewer is trying to evaluate you on three criteria:

1.	Are you right for the job?
2.	Are you willing to put in the effort to make the job a success?
3.	Are you manageable?


How to impress at the start…

Why do you want to work here?
To answer this question you must have researched the company.  Reply with the company’s attributes as you see them.  Cap your answer with reference to your belief that the company can provide you with a stable and happy work environment – and that such an atmosphere would encourage your best work.
How do you feel about your progress to date?
This question is not geared solely to rate your progress; it also rates your self-esteem.  Be positive, yet do not give the impression you have already done your best work.  Make the interviewer believe you see each day as an opportunity to learn and contribute, and that you see the environment at this company as conducive to your best efforts.
What would you like to be doing five years from now?
The safest answer contains a desire to be regarded as a true professional and team player.  As far as promotion, that depends on finding a manager with whom you can grow.  Of course, you will ask what opportunities exist within the company before being any more specific.
What are your biggest accomplishments?
Keep your answers job-related.  If you exaggerate contributions to major projects, you will lose credibility with the interviewer.  You might begin your reply with: ‘Although I feel my biggest achievements are still ahead of me, I am proud of my involvement with…  I made a contribution as part of that team and learned a lot in the process.’


 


The real you…

Tell me about yourself?
This is not an invitation to ramble on.  If the context is unclear, you need to know more about the question before giving an answer.  Whichever direction your answer ultimately takes be sure that it has some relevance to your professional endeavors.  You should also refer to one or more of your key personal qualities, such as honesty, integrity, being a team player, or determination.  For example, if you choose ‘team player’, you can tell a story about yourself outside work – perhaps as a member of a sports team – that also speaks volumes about you at work.

How well do you feel other people rated your job performance?
This is one very sound reason to ask for written evaluations of your work before leaving a company.  You should also ask for a letter of recommendation whenever you leave a job.  Don’t thrust these under your interviewer’s nose, but when you are asked the question, you can produce them with a flourish.  If you don’t have written evaluations, try to quote verbal appraisals, such as ‘My boss said only a month ago that I was the most valuable person in the work group, because…’

What is your greatest strength?
Isolate high points from your background and build in a couple of your key personal qualities, such as pride in your work, reliability and the ability to stick with a difficult task, yet change course rapidly when required.

What is your greatest weakness?
This is a direct invitation to put your head in a noose.  Decline the invitation.  If there is a minor part of the job at hand where you lack knowledge – but knowledge you will obviously pick up quickly – use that.  For instance: ‘I haven’t worked with this type of spreadsheet before but, given my experience with six other types, I should be able to pick it up in a few days.’  Another option is to design the answer so your weakness is ultimately a positive characteristic.  For example: ‘I always give each project my best shot, so if I sometimes feel others aren’t pulling their weight, I find it a little frustrating.  I try to overcome it with a positive attitude that I hope will catch on.’  Also consider the technique of putting a problem in the past and showing how you overcame it.

What are you looking for in your next job?
You want a company where your talents and experience will allow you to contribute to their business.  Avoid saying what you want the company to give you; you must say what you want in terms of what you can give to your employer.  The key word is ‘contribution’.

 
Under the spotlight

Why do you want to leave your current job?  OR Why did you leave your last job?
You should have an acceptable reason for leaving every job you have held. Generally, every good reason will fall under one of the six from the employment industry CLAMPS formula:
Challenge: 		You weren’t able to grow professionally.
Location: 		The journey to work was unreasonably long.
Advancement: 	There was nowhere for you to go.
Money: 		You were underpaid for your skills and contribution.
Pride or prestige: 	You wanted to be with a better company.
Security: 		The company was not stable.

What kind of salary are you worth?
This question is asking you to name a desired figure but the twist is that it also asks you to justify that figure.  It requires that you demonstrate careful analysis of your worth, industry norms, and job requirements.  You are recommended to try for a higher figure rather than a lower one.  If their immediate response is to say that’s too much, accept it as no more than a negotiating gambit, and come back with your own calm rebuttal: ‘What did you have in mind?’
Remember, part of our role as your Recruitment Consultant is to help you negotiate for the best salary. It can be best to defer that question to us: “I have asked my Consultant to take care of that side directly with you if the interview goes well”. Do not be evasive, but if you can avoid pigeon-holing yourself early on we can often negotiate more effectively for you.

Do you have any questions?

Almost always, this is a sign the interview is drawing to a close, and that you have one more chance to make an impression.  Remember the adage: people respect what you inspect, not what you expect.  Create questions from any of the following:

•	Find out why the job is open, who had it last and what happened to him or her?  How many people have held this position in the last couple of years?
•	What is the reporting line?  Will you get the opportunity to meet that direct line manager?
•	Where is the job located?  What are the travel requirements, if any?
•	What would your first assignment be?
•	What are the realistic chances for growth in the job?  Where are the opportunities for greatest growth within the company?
•	What are the skills and attributes most needed to get ahead in the company?
•	Who will be the company’s main competitor over the next few years?  How does the interviewer feel the company stacks up against them?
•	What has been the growth pattern of the company in the last five years?  Is it profitable?  How profitable? 


An Alternative Look At Interview Technique

In an interview situation there are three main areas to consider:
1.	Body Language
2.	Thinking on your feet
3.	What to say

Body Language
An experienced interviewer will be looking at how you compose yourself during the interview and these are some of the points you need to consider.
Posture
Sit upright, look keen and interested but not too wooden.  If you lean back this may be seen as a casual attitude and, therefore that you are not very interested in the job.  It is however, important to look and feel relaxed.
Hands
Keep control of hands as they have a tendency to let people down at interview by almost having a mind of their own.  It sometimes works to clasp hands lightly together but be careful when folding arms as this can be seen as someone being defensive and evasive.  An open stance normally suggests that a more open and honest discussion will take place. It is advised that you should not keep touching your face as this is a sign of nerves just as playing with hair or fiddling with something like a pen or button etc.
Face
Always maintain eye contact with the interviewer as this not only shows that you are interested in what is being said but also looked upon by some people as strength of character, however do not stare.  It is important to smile and look as if you are enjoying the interview even if you are extremely nervous! If the interviewer enjoys talking to you they are more likely to want to meet you again.

Time to Think
The company should already have received a copy of your CV, plus a brief Personal Profile that we put together on you.  The client will be looking to see how you compose yourself how well presented you are.  Other than that the interviewer will have specific questions that they will ask to gather more information or to test your aptitude and/or opinion in certain areas or on specific issues. They will be trying to envisage you doing the job, fitting into their culture and adopting their working practices successfully.  They will check your experience (if relevant), expertise, specific skills, attitude and how you are likely to interact with the other members of the team.  Be sure that you are prepared, which will reduce the time you have to think on your feet. Prepare beforehand answers to the questions below (you will be asked some if not all of these questions in some way shape or form).
 

What are your strengths and weaknesses?
Be honest! Relate your answers to a working environment.
Why do you wish to leave your current employer?
Do not badmouth your current employer even if you are devastatingly unhappy.
Why do you want this job?
Be positive, tell them it provides a challenge or pick on one point that really interests you and be specific. If you’re vague you won’t be convincing.
What motivates and de-motivates you?
Again be honest but relate it to work issues.  Draw on previous experience and don’t be afraid to use examples.
What do you enjoy most about your current job?
Try to relate this to work issues and bring in (if you can) similarities between the job you are being interviewed for.
What has been your greatest achievement?
Again, try and keep it work-related. Temper your answer with some modesty and perhaps acknowledge the involvement of other members of the team.
What is the biggest mistake you’ve made and what did you learn from this?
The interviewer is looking to see how you overcome a crisis; there is no wrong or right way to answer this.  If you haven’t made a mistake then tell them, but make sure you are being honest because everyone knows that we all make mistakes.
What skills can you bring into this company?
Focus only on skills that are relevant.
What do you expect to achieve in the next 5 years?
Be ambitious but realistic. Talk about becoming a respected professional within the company and contributing to further success based upon what you have learned about the company from their websites.

This list is not exhaustive and therefore it may be wise to sit down beforehand and think about questions that you may be asked or have been asked at previous interviews. Feeling prepared to 

What to Say
It is likely that you will be talking for two thirds of the interview.  It is important, therefore, that you are precise and offer detailed and exact answers to questions without waffling.  Before answering think “Why have they asked that question and what information are they looking for?” You need to be natural when in conversation and be positive with your replies.  There is nothing worse than someone who doesn’t answer the question and gives vague replies. ‘Sitting on the fence’ will do you no favours and may demonstrate your indecisiveness or lack of conviction.  It is important to be assertive without being confrontational. Also, don’t ramble, and keep answers brief and relevant - don’t go off on a tangent!


Appearance

Your appearance speaks volumes even before you’ve said a word. So:
•	Be smart & well groomed. Always wear a shirt, tie & jacket or a smart suit 
•	Keep all jewellery and make up minimal, don’t overdo it. Natural is best!

Preparation

Find out the basic information about the company - employers are impressed by those who show initiative.
•	What is the company’s product or service?
•	Number of staff employed?
•	Is the company part of a larger group?

Find out about the job in question and decide why you are right for it.
•	Read the job specification
•	Make Notes of your relevant experience
•	Note down valid points that you feel are relevant to the job in question

Always try to look at the company website – this will definitely impress them! If you do not have access to the Internet at home feel free to pop into our office and we will assist.

Punctuality

Even if you are kept waiting arrive 10 minutes early, you cannot afford to be late!

Structure of the Interview
Interviews generally follow a set pattern. The interviewer will:
•	Tell you about the company and the job
•	Ask you questions to assess your abilities, personality & motivation
•	Ask if you have any questions
•	Inform you of the next stage of the process & when a final decision will be made

At the Interview

The questions you ask at the interview are equally as important as those that you are asked. The interview is a time for you to find out if you want the job as well.  By asking the right questions you can ascertain exactly what the job will entail.  Here are some pointers when asking the interviewer for more information.
•	Be confident, positive and look at the interviewer when you talk & listen
•	Speak clearly, be enthusiastic & express a keen interest in the position
•	Try to keep your hand’s still
•	Question anything that you do not understand
•	Keep to the point, don’t ramble!


Some Possible Questions
•	Can you tell me more about the company?
•	Can you describe my area of responsibility
•	Can you show me where I will be working? (Better at second / final interview)
•	Are there any times when the company/department is busier? Seasonal peaks?
•	What are my promotion prospects?
•	Do you run any training schemes?
•	What type of clients do you deal with?
•	Will you be holding second interviews?

Obviously do not ask all these questions just select a few which are relevant and you feel comfortable asking.

Some Questions That May Require 
•	What do you know about us?
•	Describe your present duties & responsibilities?
•	Why do you want this particular job?
•	How would you describe yourself?
•	What are your strengths and weaknesses?
•	In a job what is important to you?

I hope that at this stage you feel slightly more confident about attending an interview. Please call me immediately after your interview to let me know how it went. I would appreciate your honesty at this stage. Good Luck!

Summary
Always be yourself in an interview situation as a good interviewer will see through a performance.  All the preparation in the world will not guarantee you a job but it will give you the advantage over the candidate who hasn’t done any preparation at all. We are here to help if you have any questions - do not hesitate to call us.  We can offer full advice on anything regarding your interview, from what to wear to what to say!



Below are a few idea's of essential questions to ask the interviewer.

•	What will the first 6 – 12 months look like in the role?
•	What are your expectations of the person coming into the role?
•	What is the culture of the business and this team?
•	What are the biggest challenges in this role?
•	Is there anything more you would like to know from me?
•	How have you found working for the company?
-----------------------------------------------------------------------------------------


ok?
`