const fs = require('fs');
let code = fs.readFileSync('features/workflows/shared/SharedMeetingWorkflow.tsx', 'utf-8');

// 1. Rename App
code = code.replace(/function App\(\) \{/, 'export function SharedMeetingWorkflow({ user, group, navigate }: { user: AuthUser; group: WorkflowGroup; navigate: (path: string) => void }) {');

// 2. Remove user state (since it's a prop now)
code = code.replace(/const \[user, setUser\] = useState<AuthUser \| null>\(null\);\n/, '');

// 3. Remove routing states
code = code.replace(/const \[route, setRoute\] = useState<string>\(\(\) => window.location.pathname \|\| '\/'\);\n/, '');
code = code.replace(/const \[isAdmin, setIsAdmin\] = useState<boolean>\(false\);\n/, 'const isAdmin = user?.role === \'admin\';\n');

// 4. Update the prompt logic in handleGenerateSummary
// First we need to import the custom prompts
code = code.replace(/import \{ buildMinutesCustomPrompt \} from '\.\/features\/minutes\/prompt';/, 
`import { buildMinutesCustomPrompt } from '../../minutes/prompt';
import { buildReporterPrompt } from '../reporter/prompt';
import { buildOfficerPrompt } from '../officer/prompt';`);

code = code.replace(/const customPrompt = buildMinutesCustomPrompt\(\{ meetingInfo, templatePrompt: summaryPrompt \}\);/,
`let customPrompt = '';
      if (group === 'reporter') {
        customPrompt = buildReporterPrompt({ info: meetingInfo, templatePrompt: summaryPrompt });
      } else if (group === 'officer') {
        customPrompt = buildOfficerPrompt({ info: meetingInfo, templatePrompt: summaryPrompt });
      } else {
        customPrompt = buildMinutesCustomPrompt({ meetingInfo, templatePrompt: summaryPrompt });
      }`);

// 5. Update the Form rendering logic
// Import the custom forms
code = code.replace(/import \{ MeetingInfoForm \} from '\.\/features\/minutes\/components\/MeetingInfoForm';/,
`import { MeetingInfoForm } from '../../minutes/components/MeetingInfoForm';
import { ReporterInfoForm } from '../reporter/ReporterInfoForm';
import { OfficerInfoForm } from '../officer/OfficerInfoForm';`);

code = code.replace(/<MeetingInfoForm\n\s+initialValue=\{meetingInfo\}\n\s+onChange=\{setMeetingInfo\}\n\s+onSkip=\{\(\) => setViewStep\(biênBảnStep\)\}\n\s+onContinue=\{\(\) => setViewStep\(biênBảnStep\)\}\n\s+\/>/,
`{group === 'reporter' ? (
                  <ReporterInfoForm
                    initialValue={meetingInfo as any}
                    onChange={setMeetingInfo as any}
                    onSkip={() => setViewStep(biênBảnStep)}
                    onContinue={() => setViewStep(biênBảnStep)}
                  />
                ) : group === 'officer' ? (
                  <OfficerInfoForm
                    initialValue={meetingInfo as any}
                    onChange={setMeetingInfo as any}
                    onSkip={() => setViewStep(biênBảnStep)}
                    onContinue={() => setViewStep(biênBảnStep)}
                  />
                ) : (
                  <MeetingInfoForm
                    initialValue={meetingInfo}
                    onChange={setMeetingInfo}
                    onSkip={() => setViewStep(biênBảnStep)}
                    onContinue={() => setViewStep(biênBảnStep)}
                    labels={{
                      companyName: 'Tiêu đề cuộc họp',
                    }}
                  />
                )}`);

// 6. Delete the giant routing return block at the top and just return the inner Workflow chunk
let replaceStart = code.indexOf('if (isHomeRoute) {');
let replaceEnd = code.indexOf(`{/* BƯỚC 1: Tải lên file */}`);
if(replaceStart !== -1 && replaceEnd !== -1) {
  code = code.substring(0, replaceStart) + `
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
      {/* API Key Modal logic is intact below */}
  ` + code.substring(replaceEnd);
}

// 7. Find the end of the return block and cap it.
let oldEnd = code.lastIndexOf('</main>');
let rootEnd = code.lastIndexOf('</div>', oldEnd);
// The original ended with: 
//       </main>
//     </div>
//   );
// }
// Instead we'll just replace the tail
code = code.replace(/<\/main>\n\s+<\/div>\n\s+\);\n\}$/, '</div>\n  );\n}');

fs.writeFileSync('features/workflows/shared/SharedMeetingWorkflow.tsx', code);
console.log("Extraction completed.");
