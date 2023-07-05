import { useState } from 'react'
import './GenerateInput.css'

function GenerateInput() {
    const [envDesc, setEnvDesc] = useState("");
    const [objDesc, setObjDesc] = useState("");
    const [isEnvGenerating, setIsEnvGenerating] = useState(false);
    const [isObjGenerating, setIsObjGenerating] = useState(false);

    async function submitEnvironmentDescription() {
        setIsEnvGenerating(true);

        try {
            // @ts-ignore
            await window.generateNewEnvironment(envDesc);
        } catch (e) {
            console.error(e);
            alert(e);
        }

        setIsEnvGenerating(false);
    }

    async function submitObjectDescription() {
        setIsObjGenerating(true);

        try {
            // @ts-ignore
            await window.generateNewObject(objDesc);
        } catch (e) {
            console.error(e);
            alert(e);
        }

        setIsObjGenerating(false);
    }

    return (
        <>
            <div className="generate_input_container">
                <div className="d-flex mb-2">
                    <input type="text" className="form-control generate_input me-1" placeholder="Environment description"
                        value={envDesc}
                        onChange={e => setEnvDesc(e.target.value)}
                        onKeyDown={e => { e.stopPropagation(); }}
                    />
                    <button className="btn btn-light" type="button"
                        onClick={submitEnvironmentDescription}
                        disabled={isEnvGenerating}
                    >
                        {
                            !isEnvGenerating ?
                                (
                                    <span>
                                        Generate Environment
                                    </span>
                                ) :
                                (
                                    <div className="spinner-border spinner-border-sm text-secondary" role="status">
                                    </div>
                                )
                        }
                    </button>
                </div>
                <div className="d-flex mb-2">
                    <input type="text" className="form-control generate_input me-1" placeholder="Object description"
                        value={objDesc}
                        onChange={e => setObjDesc(e.target.value)}
                        onKeyDown={e => { e.stopPropagation(); }}
                    />
                    <button className="btn btn-light" type="button"
                        onClick={submitObjectDescription}
                        disabled={isObjGenerating}
                    >
                        {
                            !isObjGenerating ?
                                (
                                    <span>
                                        Generate Object
                                    </span>
                                ) :
                                (
                                    <div className="spinner-border spinner-border-sm text-secondary" role="status">
                                    </div>
                                )
                        }
                    </button>
                </div>
                <hr/>
                <div>
                    <button className="btn btn-light" type="button"
                        data-bs-toggle="modal" data-bs-target="#plyViewerModal"
                    >
                        View Generation History
                    </button>
                </div>
            </div>
        </>
    )
}

export default GenerateInput
